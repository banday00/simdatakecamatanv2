import { NextRequest } from "next/server";
import { created, handleApiError, ok } from "@/server/http/response";
import { kependudukanResourceSchema } from "@/server/modules/pemerintahan-kependudukan/schemas";
import {
    createAdminKependudukanResource,
    listAdminKependudukanResource,
} from "@/server/modules/pemerintahan-kependudukan/service";

type RouteContext = {
    params: Promise<{ tenant: string; resource: string }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
    try {
        const { tenant, resource } = await context.params;
        return ok(await listAdminKependudukanResource(tenant, kependudukanResourceSchema.parse(resource)));
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(req: NextRequest, context: RouteContext) {
    try {
        const { tenant, resource } = await context.params;
        return created(await createAdminKependudukanResource(tenant, kependudukanResourceSchema.parse(resource), req));
    } catch (error) {
        return handleApiError(error);
    }
}
