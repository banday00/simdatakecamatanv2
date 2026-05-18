import { NextRequest } from "next/server";
import { handleApiError, ok } from "@/server/http/response";
import {
    updateAdminStuntingMeasurement,
    deleteAdminStuntingMeasurement,
} from "@/server/modules/kesehatan/stunting-service";
import { uuidSchema } from "@/server/validation/common";

type RouteContext = {
    params: Promise<{ tenant: string; id: string }>;
};

export async function PATCH(req: NextRequest, context: RouteContext) {
    try {
        const { tenant, id } = await context.params;
        return ok(await updateAdminStuntingMeasurement(tenant, uuidSchema.parse(id), req));
    } catch (error) {
        return handleApiError(error);
    }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
    try {
        const { tenant, id } = await context.params;
        return ok(await deleteAdminStuntingMeasurement(tenant, uuidSchema.parse(id), req));
    } catch (error) {
        return handleApiError(error);
    }
}
