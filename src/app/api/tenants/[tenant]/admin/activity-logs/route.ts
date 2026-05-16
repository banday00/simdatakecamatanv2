import { NextRequest } from "next/server";
import { handleApiError, ok } from "@/server/http/response";
import { listAdminActivityLogs } from "@/server/modules/admin-overview/service";

type RouteContext = { params: Promise<{ tenant: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
    try {
        const { tenant } = await context.params;
        const searchParams = req.nextUrl.searchParams;
        return ok(await listAdminActivityLogs(tenant, {
            page: searchParams.get("page") ?? undefined,
            pageSize: searchParams.get("pageSize") ?? undefined,
            action: searchParams.get("action") ?? undefined,
            search: searchParams.get("search") ?? undefined,
            dateFrom: searchParams.get("dateFrom") ?? undefined,
            dateTo: searchParams.get("dateTo") ?? undefined,
        }));
    } catch (error) {
        return handleApiError(error);
    }
}
