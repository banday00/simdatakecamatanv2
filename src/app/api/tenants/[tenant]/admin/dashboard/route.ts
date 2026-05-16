import { NextRequest } from "next/server";
import { handleApiError, ok } from "@/server/http/response";
import { getAdminDashboardData } from "@/server/modules/admin-overview/service";

type RouteContext = { params: Promise<{ tenant: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
    try {
        const { tenant } = await context.params;
        return ok(await getAdminDashboardData(tenant));
    } catch (error) {
        return handleApiError(error);
    }
}
