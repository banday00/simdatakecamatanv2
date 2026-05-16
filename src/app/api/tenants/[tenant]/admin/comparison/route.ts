import { NextRequest } from "next/server";
import { handleApiError, ok } from "@/server/http/response";
import { getAdminComparisonData } from "@/server/modules/admin-overview/service";

type RouteContext = { params: Promise<{ tenant: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
    try {
        const { tenant } = await context.params;
        return ok(await getAdminComparisonData(tenant, {
            indicators: req.nextUrl.searchParams.get("indicators") ?? undefined,
            kelurahanIds: req.nextUrl.searchParams.get("kelurahanIds") ?? undefined,
        }));
    } catch (error) {
        return handleApiError(error);
    }
}
