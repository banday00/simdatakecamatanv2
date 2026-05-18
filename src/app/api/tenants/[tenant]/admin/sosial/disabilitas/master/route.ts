import { NextRequest } from "next/server";
import { handleApiError, ok } from "@/server/http/response";
import { getMasterData } from "@/server/modules/disabilitas/service";

type RouteContext = {
    params: Promise<{ tenant: string }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
    try {
        const { tenant } = await context.params;
        return ok(await getMasterData(tenant));
    } catch (error) {
        return handleApiError(error);
    }
}
