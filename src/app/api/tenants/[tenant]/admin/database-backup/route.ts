import { NextRequest } from "next/server";
import { handleApiError, ok } from "@/server/http/response";
import { createDatabaseBackup, listDatabaseBackupLogs } from "@/server/modules/database-backup/service";

export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
    try {
        return ok(await listDatabaseBackupLogs());
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(req: NextRequest) {
    try {
        const backup = await createDatabaseBackup(req);
        return ok(backup);
    } catch (error) {
        return handleApiError(error);
    }
}
