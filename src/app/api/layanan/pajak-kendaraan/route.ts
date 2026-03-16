import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        
        // Ensure webhook URL exists
        const webhookUrl = process.env.N8N_WEBHOOK_PAJAK_KENDARAAN;
        if (!webhookUrl) {
            console.error("N8N_WEBHOOK_PAJAK_KENDARAAN is not defined");
            return NextResponse.json({ success: false, message: "Server configuration error." }, { status: 500 });
        }

        // Append query parameters to webhook URL
        const urlObj = new URL(webhookUrl);
        urlObj.searchParams.append("no_polisi", body.no_polisi || "");
        urlObj.searchParams.append("kd_plat", body.kd_plat || "1");

        // Forward request forward to N8N webhook as GET
        const response = await fetch(urlObj.toString(), {
            method: "GET",
            headers: {
                "Accept": "application/json"
            }
        });

        // The response might be array or object
        const data = await response.json();
        
        return NextResponse.json(data);
    } catch (error) {
        console.error("Error fetching pajak kendaraan:", error);
        return NextResponse.json(
            { success: false, message: "Terjadi kesalahan saat memproses data." },
            { status: 500 }
        );
    }
}
