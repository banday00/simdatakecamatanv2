import { NextRequest } from "next/server";
import { created, handleApiError, ok } from "@/server/http/response";
import {
    listAdminStuntingChildren,
    createAdminStuntingMeasurement,
} from "@/server/modules/kesehatan/stunting-service";

type RouteContext = {
    params: Promise<{ tenant: string }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
    try {
        const { tenant } = await context.params;
        return ok(await listAdminStuntingChildren(tenant));
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(req: NextRequest, context: RouteContext) {
    try {
        const { tenant } = await context.params;
        return created(await createAdminStuntingMeasurement(tenant, req));
    } catch (error) {
        return handleApiError(error);
    }
}
