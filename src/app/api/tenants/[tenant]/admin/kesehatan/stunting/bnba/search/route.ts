import { NextRequest } from "next/server";
import { handleApiError, ok } from "@/server/http/response";
import { searchStuntingNIK } from "@/server/modules/kesehatan/stunting-service";

type RouteContext = {
    params: Promise<{ tenant: string }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
    try {
        const { tenant } = await context.params;
        const nik = req.nextUrl.searchParams.get("nik") ?? "";
        return ok(await searchStuntingNIK(tenant, nik));
    } catch (error) {
        return handleApiError(error);
    }
}
