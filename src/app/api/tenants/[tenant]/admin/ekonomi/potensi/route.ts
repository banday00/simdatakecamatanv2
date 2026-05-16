import { NextRequest } from "next/server";
import { created, handleApiError, ok } from "@/server/http/response";
import { createAdminEkonomiResource, listAdminEkonomiResource } from "@/server/modules/ekonomi/service";

type RouteContext = {
    params: Promise<{ tenant: string }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
    try {
        const { tenant } = await context.params;
        return ok(await listAdminEkonomiResource(tenant, "potensi"));
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(req: NextRequest, context: RouteContext) {
    try {
        const { tenant } = await context.params;
        return created(await createAdminEkonomiResource(tenant, "potensi", req));
    } catch (error) {
        return handleApiError(error);
    }
}
