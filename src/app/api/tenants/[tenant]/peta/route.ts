import { NextRequest } from "next/server";
import { handleApiError, ok } from "@/server/http/response";
import { getPublicPetaData } from "@/server/modules/peta/service";

type RouteContext = {
    params: Promise<{ tenant: string }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
    try {
        const { tenant } = await context.params;
        return ok(await getPublicPetaData(tenant));
    } catch (error) {
        return handleApiError(error);
    }
}
