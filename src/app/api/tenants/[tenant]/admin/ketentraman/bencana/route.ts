import { NextRequest } from "next/server";
import { created, handleApiError, ok } from "@/server/http/response";
import {
    createAdminKetentramanResource,
    listAdminKetentramanResource,
} from "@/server/modules/ketentraman/service";

type RouteContext = {
    params: Promise<{ tenant: string }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
    try {
        const { tenant } = await context.params;
        return ok(await listAdminKetentramanResource(tenant, "bencana"));
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(req: NextRequest, context: RouteContext) {
    try {
        const { tenant } = await context.params;
        return created(await createAdminKetentramanResource(tenant, "bencana", req));
    } catch (error) {
        return handleApiError(error);
    }
}
