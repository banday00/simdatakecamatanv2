import { NextResponse } from "next/server";

export async function POST() {
    return NextResponse.json(
        {
            data: null,
            error: {
                code: "GENERIC_QUERY_DISABLED",
                message: "Generic database API sudah dinonaktifkan. Gunakan endpoint modul eksplisit.",
            },
        },
        { status: 410 }
    );
}
