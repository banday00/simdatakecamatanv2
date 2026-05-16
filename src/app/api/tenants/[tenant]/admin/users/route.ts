import { NextRequest } from "next/server";
import { created, handleApiError, ok } from "@/server/http/response";
import { createAdminUser, listAdminUsers } from "@/server/modules/users/service";

type RouteContext = {
    params: Promise<{ tenant: string }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
    try {
        const { tenant } = await context.params;
        return ok(await listAdminUsers(tenant));
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(req: NextRequest, context: RouteContext) {
    try {
        const { tenant } = await context.params;
        return created(await createAdminUser(tenant, req));
    } catch (error) {
        return handleApiError(error);
    }
}

