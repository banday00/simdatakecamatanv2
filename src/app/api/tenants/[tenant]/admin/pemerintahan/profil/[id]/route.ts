import { NextRequest } from "next/server";
import { handleApiError, ok } from "@/server/http/response";
import { uuidSchema } from "@/server/validation/common";
import { deleteAdminProfil, updateAdminProfil } from "@/server/modules/pemerintahan-profil/service";

type RouteContext = {
    params: Promise<{ tenant: string; id: string }>;
};

export async function PATCH(req: NextRequest, context: RouteContext) {
    try {
        const { tenant, id } = await context.params;
        return ok(await updateAdminProfil(tenant, uuidSchema.parse(id), req));
    } catch (error) {
        return handleApiError(error);
    }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
    try {
        const { tenant, id } = await context.params;
        return ok(await deleteAdminProfil(tenant, uuidSchema.parse(id), req));
    } catch (error) {
        return handleApiError(error);
    }
}

