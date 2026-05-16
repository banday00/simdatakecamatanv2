import { NextRequest } from "next/server";
import { handleApiError, ok } from "@/server/http/response";
import { updateAdminOrganisasi, deleteAdminOrganisasi } from "@/server/modules/pemerintahan-organisasi/service";
import { uuidSchema } from "@/server/validation/common";

type RouteContext = {
    params: Promise<{ tenant: string; id: string }>;
};

export async function PATCH(req: NextRequest, context: RouteContext) {
    try {
        const { tenant, id } = await context.params;
        return ok(await updateAdminOrganisasi(tenant, uuidSchema.parse(id), req));
    } catch (error) {
        return handleApiError(error);
    }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
    try {
        const { tenant, id } = await context.params;
        return ok(await deleteAdminOrganisasi(tenant, uuidSchema.parse(id), req));
    } catch (error) {
        return handleApiError(error);
    }
}
