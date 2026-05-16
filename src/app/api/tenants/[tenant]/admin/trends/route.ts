import { NextRequest } from "next/server";
import { handleApiError, ok } from "@/server/http/response";
import { getAdminTrendData } from "@/server/modules/admin-overview/service";

type RouteContext = { params: Promise<{ tenant: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
    try {
        const { tenant } = await context.params;
        return ok(await getAdminTrendData(tenant, {
            indicator: req.nextUrl.searchParams.get("indicator") ?? undefined,
        }));
    } catch (error) {
        return handleApiError(error);
    }
}
