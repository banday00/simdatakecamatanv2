import { NextRequest } from "next/server";
import { handleApiError, ok } from "@/server/http/response";
import { getAdminSiswaSummary } from "@/server/modules/pendidikan/service";

type RouteContext = {
    params: Promise<{ tenant: string }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
    try {
        const { tenant } = await context.params;
        return ok(await getAdminSiswaSummary(tenant, req));
    } catch (error) {
        return handleApiError(error);
    }
}
