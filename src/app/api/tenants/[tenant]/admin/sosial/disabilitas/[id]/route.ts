import { NextRequest } from "next/server";
import { handleApiError, ok } from "@/server/http/response";
import { updateAdminDisabilitas, deleteAdminDisabilitas } from "@/server/modules/disabilitas/service";
import { uuidSchema } from "@/server/validation/common";

type RouteContext = {
    params: Promise<{ tenant: string; id: string }>;
};

export async function PATCH(req: NextRequest, context: RouteContext) {
    try {
        const { tenant, id } = await context.params;
        return ok(await updateAdminDisabilitas(tenant, uuidSchema.parse(id), req));
    } catch (error) {
        return handleApiError(error);
    }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
    try {
        const { tenant, id } = await context.params;
        return ok(await deleteAdminDisabilitas(tenant, uuidSchema.parse(id), req));
    } catch (error) {
        return handleApiError(error);
    }
}
