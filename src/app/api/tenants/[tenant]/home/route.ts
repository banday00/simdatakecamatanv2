import { NextRequest } from "next/server";
import { handleApiError, ok } from "@/server/http/response";
import { getPublicHomeData } from "@/server/modules/public-data/service";

type RouteContext = { params: Promise<{ tenant: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
    try {
        const { tenant } = await context.params;
        return ok(await getPublicHomeData(tenant));
    } catch (error) {
        return handleApiError(error);
    }
}
