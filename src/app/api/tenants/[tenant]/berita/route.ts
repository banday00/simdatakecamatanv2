import { NextRequest } from "next/server";
import { handleApiError, ok } from "@/server/http/response";
import { listPublicBerita } from "@/server/modules/berita/service";

type RouteContext = {
    params: Promise<{ tenant: string }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
    try {
        const { tenant } = await context.params;
        const result = await listPublicBerita(tenant, req);
        return ok(result.rows, { pagination: result.pagination });
    } catch (error) {
        return handleApiError(error);
    }
}

