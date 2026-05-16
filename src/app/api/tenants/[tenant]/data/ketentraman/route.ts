import { NextRequest } from "next/server";
import { handleApiError, ok } from "@/server/http/response";
import { getPublicKetentramanData } from "@/server/modules/public-data/service";

type RouteContext = { params: Promise<{ tenant: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
    try {
        const { tenant } = await context.params;
        return ok(await getPublicKetentramanData(tenant));
    } catch (error) {
        return handleApiError(error);
    }
}
