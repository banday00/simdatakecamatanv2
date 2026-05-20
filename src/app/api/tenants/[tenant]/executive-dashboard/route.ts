import { NextRequest } from "next/server";
import { handleApiError, ok } from "@/server/http/response";
import { getExecutiveDashboardData } from "@/server/modules/executive-dashboard/service";

type RouteContext = { params: Promise<{ tenant: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
    try {
        const { tenant } = await context.params;
        const url = new URL(req.url);
        const kelurahanId = url.searchParams.get("kelurahanId") || undefined;
        const tahunStr = url.searchParams.get("tahun");
        const tahun = tahunStr ? parseInt(tahunStr, 10) : undefined;

        return ok(await getExecutiveDashboardData(tenant, { kelurahanId, tahun }));
    } catch (error) {
        return handleApiError(error);
    }
}
