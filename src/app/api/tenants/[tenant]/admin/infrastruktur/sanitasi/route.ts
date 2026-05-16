import { NextRequest } from "next/server";
import { created, handleApiError, ok } from "@/server/http/response";
import {
    createAdminInfrastrukturResource,
    listAdminInfrastrukturResource,
} from "@/server/modules/infrastruktur/service";

type RouteContext = {
    params: Promise<{ tenant: string }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
    try {
        const { tenant } = await context.params;
        return ok(await listAdminInfrastrukturResource(tenant, "sanitasi"));
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(req: NextRequest, context: RouteContext) {
    try {
        const { tenant } = await context.params;
        return created(await createAdminInfrastrukturResource(tenant, "sanitasi", req));
    } catch (error) {
        return handleApiError(error);
    }
}
