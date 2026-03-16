import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Check if N8N Webhook is defined
        const webhookUrl = process.env.N8N_WEBHOOK_PBB;
        if (!webhookUrl) {
            console.error("N8N_WEBHOOK_PBB is not defined in environment variables");
            return NextResponse.json({ success: false, message: "Server configuration error." }, { status: 500 });
        }

        // Append query parameters to webhook URL
        const urlObj = new URL(webhookUrl);
        urlObj.searchParams.append("nik", body.nik || "");

        // Forward request forward to N8N webhook as GET
        const response = await fetch(urlObj.toString(), {
            method: "GET",
            headers: {
                "Accept": "application/json"
            }
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("N8N PBB Webhook Error Status:", response.status, errText);
            return NextResponse.json({ success: false, message: "Terjadi kesalahan pada layanan (N8N Endpoint Error)." }, { status: response.status });
        }

        const data = await response.json();
        
        // Return exactly what the webhook returns
        return NextResponse.json({ success: true, data: data });
    } catch (error: any) {
        console.error("Error connecting to N8N PBB Webhook:", error);
        return NextResponse.json({ success: false, message: "Gagal terhubung ke layanan data pencarian PBB." }, { status: 500 });
    }
}
