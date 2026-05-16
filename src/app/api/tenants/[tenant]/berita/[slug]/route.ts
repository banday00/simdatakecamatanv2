import { handleApiError, ok } from "@/server/http/response";
import { beritaSlugParamsSchema } from "@/server/modules/berita/schemas";
import { getPublicBeritaDetail } from "@/server/modules/berita/service";

type RouteContext = {
    params: Promise<{ tenant: string; slug: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
    try {
        const { tenant, slug } = await context.params;
        const parsed = beritaSlugParamsSchema.parse({ slug });
        return ok(await getPublicBeritaDetail(tenant, parsed.slug));
    } catch (error) {
        return handleApiError(error);
    }
}

