import { NextRequest } from "next/server";
import { handleApiError, ok } from "@/server/http/response";
import { beritaIdParamsSchema } from "@/server/modules/berita/schemas";
import { deleteAdminBerita, updateAdminBerita } from "@/server/modules/berita/service";

type RouteContext = {
    params: Promise<{ tenant: string; id: string }>;
};

export async function PATCH(req: NextRequest, context: RouteContext) {
    try {
        const { tenant, id } = await context.params;
        const parsed = beritaIdParamsSchema.parse({ id });
        return ok(await updateAdminBerita(tenant, parsed.id, req));
    } catch (error) {
        return handleApiError(error);
    }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
    try {
        const { tenant, id } = await context.params;
        const parsed = beritaIdParamsSchema.parse({ id });
        return ok(await deleteAdminBerita(tenant, parsed.id, req));
    } catch (error) {
        return handleApiError(error);
    }
}

