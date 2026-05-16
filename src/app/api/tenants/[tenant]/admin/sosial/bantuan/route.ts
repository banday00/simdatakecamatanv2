import { NextRequest } from "next/server";
import { created, handleApiError, ok } from "@/server/http/response";
import { createAdminSosialResource, listAdminSosialResource } from "@/server/modules/sosial/service";

type RouteContext = {
    params: Promise<{ tenant: string }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
    try {
        const { tenant } = await context.params;
        return ok(await listAdminSosialResource(tenant, "bantuan"));
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(req: NextRequest, context: RouteContext) {
    try {
        const { tenant } = await context.params;
        return created(await createAdminSosialResource(tenant, "bantuan", req));
    } catch (error) {
        return handleApiError(error);
    }
}
