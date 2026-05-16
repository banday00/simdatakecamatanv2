import { NextRequest } from "next/server";
import { handleApiError, ok } from "@/server/http/response";
import { kependudukanResourceSchema } from "@/server/modules/pemerintahan-kependudukan/schemas";
import {
    deleteAdminKependudukanResource,
    updateAdminKependudukanResource,
} from "@/server/modules/pemerintahan-kependudukan/service";
import { uuidSchema } from "@/server/validation/common";

type RouteContext = {
    params: Promise<{ tenant: string; resource: string; id: string }>;
};

export async function PATCH(req: NextRequest, context: RouteContext) {
    try {
        const { tenant, resource, id } = await context.params;
        return ok(await updateAdminKependudukanResource(
            tenant,
            kependudukanResourceSchema.parse(resource),
            uuidSchema.parse(id),
            req
        ));
    } catch (error) {
        return handleApiError(error);
    }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
    try {
        const { tenant, resource, id } = await context.params;
        return ok(await deleteAdminKependudukanResource(
            tenant,
            kependudukanResourceSchema.parse(resource),
            uuidSchema.parse(id),
            req
        ));
    } catch (error) {
        return handleApiError(error);
    }
}
