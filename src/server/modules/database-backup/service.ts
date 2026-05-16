import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import type { NextRequest } from "next/server";
import { pool } from "@/db/client";
import { logServerActivity } from "@/server/activity/log";
import { requireAuth, requireRole } from "@/server/auth/guards";
import { assertRateLimit } from "@/server/security/rate-limit";
import type { UserProfile } from "@/types";

type TableColumn = {
    table_name: string;
    column_name: string;
    ordinal_position: number;
};

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

async function getBackupTables() {
    const result = await pool.query<{ table_name: string }>(
        `SELECT table_name
         FROM information_schema.tables
         WHERE table_schema = 'public'
           AND table_type = 'BASE TABLE'
         ORDER BY table_name ASC`
    );

    const columnsResult = await pool.query<TableColumn>(
        `SELECT table_name, column_name, ordinal_position
         FROM information_schema.columns
         WHERE table_schema = 'public'
         ORDER BY table_name ASC, ordinal_position ASC`
    );

    const columnsByTable = new Map<string, string[]>();
    for (const column of columnsResult.rows) {
        const columns = columnsByTable.get(column.table_name) ?? [];
        columns.push(column.column_name);
        columnsByTable.set(column.table_name, columns);
    }

    return result.rows
        .map((table) => ({
            name: table.table_name,
            columns: columnsByTable.get(table.table_name) ?? [],
        }))
        .filter((table) => table.columns.length > 0);
}

async function appendTableData(lines: string[], tableName: string, columns: string[]) {
    const quotedColumns = columns.map(quoteIdentifier);
    const tableRef = `public.${quoteIdentifier(tableName)}`;
    const query = `SELECT ${quotedColumns.join(", ")} FROM ${tableRef}`;
    const result = await pool.query<Record<string, unknown>>(query);

    lines.push("");
    lines.push(`-- Table: public.${tableName}`);

    if (result.rowCount === 0) {
        lines.push(`-- No rows exported for public.${tableName}.`);
        return { rowCount: 0 };
    }

    const columnSql = quotedColumns.join(", ");
    for (const row of result.rows) {
        const values = columns.map((column) => quoteLiteral(row[column])).join(", ");
        lines.push(`INSERT INTO ${tableRef} (${columnSql}) VALUES (${values});`);
    }

    return { rowCount: result.rowCount ?? result.rows.length };
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
    const lines = [
        "-- SIDAKOTA database backup",
        `-- Generated at: ${now.toISOString()}`,
        "-- Scope: full database data export",
        "",
        "BEGIN;",
    ];

    const tables = await getBackupTables();
    let tableCount = 0;
    let rowCount = 0;

    for (const table of tables) {
        const result = await appendTableData(lines, table.name, table.columns);
        tableCount += 1;
        rowCount += result.rowCount;
    }

    lines.push("");
    lines.push("COMMIT;");
    lines.push("");

    const sql = lines.join("\n");
    const sizeBytes = Buffer.byteLength(sql, "utf8");
    const storage = getBackupStoragePath(filename);

    await mkdir(storage.directory, { recursive: true });
    await writeFile(storage.filePath, sql, "utf8");

    await logServerActivity({
        action: "backup",
        tenantId: null,
        profile,
        module: BACKUP_MODULE,
        recordTable: "public",
        recordId: filename,
        detail: `Backup database berhasil disimpan di server: ${storage.displayPath} (${tableCount} tabel, ${rowCount} baris, ${(sizeBytes / 1024).toFixed(1)} KB).`,
        userAgent: req.headers.get("user-agent"),
        ipAddress,
    });

    return {
        filename,
        storagePath: storage.displayPath,
        rowCount,
        tableCount,
        sizeBytes,
    };
}
