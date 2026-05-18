import { NextRequest } from "next/server";
import { handleApiError, ok } from "@/server/http/response";
import { searchNIK } from "@/server/modules/perumahan/service";

type RouteContext = {
    params: Promise<{ tenant: string }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
    try {
        const { tenant } = await context.params;
        const nik = req.nextUrl.searchParams.get("nik") ?? "";
        return ok(await searchNIK(tenant, nik));
    } catch (error) {
        return handleApiError(error);
    }
}
