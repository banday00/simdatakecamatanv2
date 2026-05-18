import { NextRequest } from "next/server";
import { handleApiError, ok } from "@/server/http/response";
import { searchNIK } from "@/server/modules/disabilitas/service";

type RouteContext = {
    params: Promise<{ tenant: string }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
    try {
        const { tenant } = await context.params;
        const { searchParams } = new URL(req.url);
        const nik = searchParams.get("nik");
        if (!nik || !/^\d{1,16}$/.test(nik)) {
            return ok(null);
        }
        return ok(await searchNIK(tenant, nik));
    } catch (error) {
        return handleApiError(error);
    }
}
