import { NextRequest } from "next/server";
import { handleApiError, ok } from "@/server/http/response";
import { listAdminStuntingAgregat } from "@/server/modules/kesehatan/service";

type RouteContext = {
    params: Promise<{ tenant: string }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
    try {
        const { tenant } = await context.params;
        return ok(await listAdminStuntingAgregat(tenant));
    } catch (error) {
        return handleApiError(error);
    }
}
