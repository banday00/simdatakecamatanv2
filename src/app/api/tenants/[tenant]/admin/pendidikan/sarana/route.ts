import { NextRequest } from "next/server";
import { created, handleApiError, ok } from "@/server/http/response";
import { createAdminPendidikanResource, listAdminPendidikanResource } from "@/server/modules/pendidikan/service";

type RouteContext = {
    params: Promise<{ tenant: string }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
    try {
        const { tenant } = await context.params;
        return ok(await listAdminPendidikanResource(tenant, "sarana"));
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(req: NextRequest, context: RouteContext) {
    try {
        const { tenant } = await context.params;
        return created(await createAdminPendidikanResource(tenant, "sarana", req));
    } catch (error) {
        return handleApiError(error);
    }
}
