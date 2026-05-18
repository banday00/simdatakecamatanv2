import { NextRequest } from "next/server";
import { handleApiError, ok } from "@/server/http/response";
import { listAdminChildMeasurements } from "@/server/modules/kesehatan/stunting-service";
import { uuidSchema } from "@/server/validation/common";

type RouteContext = {
    params: Promise<{ tenant: string; pendudukId: string }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
    try {
        const { tenant, pendudukId } = await context.params;
        return ok(await listAdminChildMeasurements(tenant, uuidSchema.parse(pendudukId)));
    } catch (error) {
        return handleApiError(error);
    }
}
