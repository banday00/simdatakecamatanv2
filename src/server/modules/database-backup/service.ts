import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { NextRequest } from "next/server";
import { pool } from "@/db/client";
import { logServerActivity } from "@/server/activity/log";
import { requireAuth, requireRole } from "@/server/auth/guards";
import { assertRateLimit } from "@/server/security/rate-limit";
import type { UserProfile } from "@/types";

const execFileAsync = promisify(execFile);

type BackupLogRow = {
    id: string;
    user_name: string | null;
    detail: string | null;
    record_id: string | null;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
};

const BACKUP_MODULE = "database_backup";
const DEFAULT_BACKUP_ROOT = join(process.cwd(), "backupdb");

function backupFileName(now: Date) {
    const timestamp = now.toISOString().replace(/[:.]/g, "-");
    return `backup-full-${timestamp}.sql`;
}

function getBackupStoragePath(filename: string) {
    const root = resolve(DEFAULT_BACKUP_ROOT);
    const filePath = join(root, filename);
    const cwdRelative = relative(process.cwd(), filePath).replace(/\\/g, "/");
    const displayPath = cwdRelative.startsWith("..") ? filePath : cwdRelative;

    return {
        directory: root,
        filePath,
        displayPath,
    };
}

function getClientIp(req: NextRequest) {
    return (
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        "local"
    );
}

function assertBackupAccess(profile: UserProfile) {
    requireRole(profile, ["super_admin"]);
}

/**
 * Parse DATABASE_URL to extract connection parts for pg_dump.
 * Format: postgresql://user:password@host:port/dbname
 */
function parseDatabaseUrl() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL is not set");

    const url = new URL(dbUrl);
    return {
        host: url.hostname,
        port: url.port || "5432",
        user: url.username,
        password: decodeURIComponent(url.password),
        database: url.pathname.replace(/^\//, ""),
    };
}

/**
 * Check if pg_dump is available on the system.
 * Returns true if available (Docker with postgres-client), false otherwise.
 */
async function isPgDumpAvailable(): Promise<boolean> {
    try {
        await execFileAsync("pg_dump", ["--version"]);
        return true;
    } catch {
        return false;
    }
}

/**
 * Full backup using pg_dump (schema + data + indexes + constraints + sequences).
 * This produces a proper SQL dump that can be restored with psql.
 */
async function backupWithPgDump(filePath: string) {
    const db = parseDatabaseUrl();

    const { stdout } = await execFileAsync("pg_dump", [
        "--host", db.host,
        "--port", db.port,
        "--username", db.user,
        "--dbname", db.database,
        "--format", "plain",
        "--no-owner",
        "--no-privileges",
        "--clean",
        "--if-exists",
        "--verbose",
    ], {
        env: { ...process.env, PGPASSWORD: db.password },
        maxBuffer: 500 * 1024 * 1024, // 500MB max
    });

    await writeFile(filePath, stdout, "utf8");

    return Buffer.byteLength(stdout, "utf8");
}

/**
 * Fallback: data-only backup using SQL queries.
 * Used when pg_dump is not available (e.g., dev environment without postgres-client).
 */
async function backupDataOnly(filePath: string) {
    type TableColumn = {
        table_name: string;
        column_name: string;
        ordinal_position: number;
    };

    function quoteIdentifier(value: string) {
        return `"${value.replace(/"/g, '""')}"`;
    }

    function quoteLiteral(value: unknown): string {
        if (value === null || value === undefined) return "NULL";
        if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
        if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
        if (value instanceof Date) return `'${value.toISOString().replace(/'/g, "''")}'`;
        if (Buffer.isBuffer(value)) return `decode('${value.toString("hex")}', 'hex')`;
        if (typeof value === "object") return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
        return `'${String(value).replace(/'/g, "''")}'`;
    }

    // --- Schema: CREATE TABLE ---
    const tablesResult = await pool.query<{ table_name: string }>(
        `SELECT table_name FROM information_schema.tables
         WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
         ORDER BY table_name ASC`
    );

    const columnsResult = await pool.query<TableColumn & {
        data_type: string;
        udt_name: string;
        character_maximum_length: number | null;
        column_default: string | null;
        is_nullable: string;
    }>(
        `SELECT table_name, column_name, ordinal_position,
                data_type, udt_name, character_maximum_length,
                column_default, is_nullable
         FROM information_schema.columns
         WHERE table_schema = 'public'
         ORDER BY table_name ASC, ordinal_position ASC`
    );

    const columnsByTable = new Map<string, typeof columnsResult.rows>();
    for (const col of columnsResult.rows) {
        const cols = columnsByTable.get(col.table_name) ?? [];
        cols.push(col);
        columnsByTable.set(col.table_name, cols);
    }

    // --- Primary keys ---
    const pkResult = await pool.query<{ table_name: string; column_name: string }>(
        `SELECT tc.table_name, kcu.column_name
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
         WHERE tc.constraint_type = 'PRIMARY KEY'
           AND tc.table_schema = 'public'
         ORDER BY tc.table_name, kcu.ordinal_position`
    );
    const pkByTable = new Map<string, string[]>();
    for (const pk of pkResult.rows) {
        const pks = pkByTable.get(pk.table_name) ?? [];
        pks.push(pk.column_name);
        pkByTable.set(pk.table_name, pks);
    }

    const lines: string[] = [
        "-- SIMDATA database backup (fallback mode: schema + data)",
        `-- Generated at: ${new Date().toISOString()}`,
        "-- WARNING: This backup was created without pg_dump.",
        "-- It includes basic CREATE TABLE + INSERT but may miss indexes,",
        "-- foreign keys, triggers, and other advanced objects.",
        "",
    ];

    let tableCount = 0;
    let rowCount = 0;

    for (const table of tablesResult.rows) {
        const cols = columnsByTable.get(table.table_name);
        if (!cols || cols.length === 0) continue;

        // DROP + CREATE TABLE
        const tableRef = `public.${quoteIdentifier(table.table_name)}`;
        lines.push(`-- Table: ${tableRef}`);
        lines.push(`DROP TABLE IF EXISTS ${tableRef} CASCADE;`);

        const colDefs: string[] = [];
        for (const col of cols) {
            let typeName = col.udt_name;
            if (col.data_type === "character varying" && col.character_maximum_length) {
                typeName = `varchar(${col.character_maximum_length})`;
            } else if (col.data_type === "character varying") {
                typeName = "text";
            } else if (col.data_type === "USER-DEFINED") {
                typeName = col.udt_name;
            }

            let def = `  ${quoteIdentifier(col.column_name)} ${typeName}`;
            if (col.column_default) def += ` DEFAULT ${col.column_default}`;
            if (col.is_nullable === "NO") def += " NOT NULL";
            colDefs.push(def);
        }

        // Add primary key
        const pkCols = pkByTable.get(table.table_name);
        if (pkCols && pkCols.length > 0) {
            colDefs.push(`  PRIMARY KEY (${pkCols.map(quoteIdentifier).join(", ")})`);
        }

        lines.push(`CREATE TABLE ${tableRef} (`);
        lines.push(colDefs.join(",\n"));
        lines.push(");");
        lines.push("");

        // INSERT data
        const quotedColumns = cols.map((c) => quoteIdentifier(c.column_name));
        const query = `SELECT ${quotedColumns.join(", ")} FROM ${tableRef}`;
        const result = await pool.query<Record<string, unknown>>(query);

        if (result.rowCount && result.rowCount > 0) {
            const columnSql = quotedColumns.join(", ");
            for (const row of result.rows) {
                const values = cols.map((c) => quoteLiteral(row[c.column_name])).join(", ");
                lines.push(`INSERT INTO ${tableRef} (${columnSql}) VALUES (${values});`);
            }
            rowCount += result.rowCount;
        }

        lines.push("");
        tableCount += 1;
    }

    const sql = lines.join("\n");
    await writeFile(filePath, sql, "utf8");

    return { sizeBytes: Buffer.byteLength(sql, "utf8"), tableCount, rowCount };
}

export async function listDatabaseBackupLogs() {
    const profile = await requireAuth();
    assertBackupAccess(profile);

    const [rowsResult, statsResult] = await Promise.all([
        pool.query<BackupLogRow>(
            `SELECT id, user_name, detail, record_id, ip_address::text AS ip_address,
                    user_agent, created_at
             FROM activity_logs
             WHERE module = $1
               AND action = 'backup'
             ORDER BY created_at DESC
             LIMIT 30`,
            [BACKUP_MODULE]
        ),
        pool.query<{ total: number; last_backup_at: string | null }>(
            `SELECT COUNT(*)::int AS total, MAX(created_at)::text AS last_backup_at
             FROM activity_logs
             WHERE module = $1
               AND action = 'backup'`,
            [BACKUP_MODULE]
        ),
    ]);

    return {
        rows: rowsResult.rows,
        stats: statsResult.rows[0] ?? { total: 0, last_backup_at: null },
    };
}

export async function createDatabaseBackup(req: NextRequest) {
    const profile = await requireAuth();
    assertBackupAccess(profile);

    const ipAddress = getClientIp(req);
    assertRateLimit(`backup:full:${profile.id}:${ipAddress}`, 5, 60 * 60 * 1000);

    const now = new Date();
    const filename = backupFileName(now);
    const storage = getBackupStoragePath(filename);

    await mkdir(storage.directory, { recursive: true });

    let tableCount = 0;
    let rowCount = 0;
    let sizeBytes = 0;
    let method: "pg_dump" | "fallback";

    const pgDumpAvailable = await isPgDumpAvailable();

    if (pgDumpAvailable) {
        // Full backup with pg_dump (includes schema, indexes, FK, sequences, triggers)
        method = "pg_dump";
        sizeBytes = await backupWithPgDump(storage.filePath);

        // Count tables and rows for the log
        const countResult = await pool.query<{ table_name: string; row_count: string }>(
            `SELECT schemaname || '.' || relname AS table_name, n_live_tup::text AS row_count
             FROM pg_stat_user_tables WHERE schemaname = 'public'`
        );
        tableCount = countResult.rowCount ?? 0;
        rowCount = countResult.rows.reduce((sum, r) => sum + parseInt(r.row_count, 10), 0);
    } else {
        // Fallback: schema + data via SQL queries
        method = "fallback";
        const result = await backupDataOnly(storage.filePath);
        sizeBytes = result.sizeBytes;
        tableCount = result.tableCount;
        rowCount = result.rowCount;
    }

    const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);

    await logServerActivity({
        action: "backup",
        tenantId: null,
        profile,
        module: BACKUP_MODULE,
        recordTable: "public",
        recordId: filename,
        detail: `Backup database [${method}] berhasil: ${storage.displayPath} (${tableCount} tabel, ${rowCount} baris, ${sizeMB} MB).`,
        userAgent: req.headers.get("user-agent"),
        ipAddress,
    });

    return {
        filename,
        storagePath: storage.displayPath,
        rowCount,
        tableCount,
        sizeBytes,
        method,
    };
}
