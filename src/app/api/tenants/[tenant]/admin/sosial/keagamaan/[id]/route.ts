import { NextRequest } from "next/server";
import { handleApiError, ok } from "@/server/http/response";
import { deleteAdminSosialResource, updateAdminSosialResource } from "@/server/modules/sosial/service";
import { uuidSchema } from "@/server/validation/common";

type RouteContext = {
    params: Promise<{ tenant: string; id: string }>;
};

export async function PATCH(req: NextRequest, context: RouteContext) {
    try {
        const { tenant, id } = await context.params;
        return ok(await updateAdminSosialResource(tenant, "keagamaan", uuidSchema.parse(id), req));
    } catch (error) {
        return handleApiError(error);
    }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
    try {
        const { tenant, id } = await context.params;
        return ok(await deleteAdminSosialResource(tenant, "keagamaan", uuidSchema.parse(id), req));
    } catch (error) {
        return handleApiError(error);
    }
}
