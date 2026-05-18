import { NextRequest } from "next/server";
import { created, handleApiError, ok } from "@/server/http/response";
import { listAdminDisabilitas, createAdminDisabilitas } from "@/server/modules/disabilitas/service";

type RouteContext = {
    params: Promise<{ tenant: string }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
    try {
        const { tenant } = await context.params;
        return ok(await listAdminDisabilitas(tenant));
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(req: NextRequest, context: RouteContext) {
    try {
        const { tenant } = await context.params;
        return created(await createAdminDisabilitas(tenant, req));
    } catch (error) {
        return handleApiError(error);
    }
}
