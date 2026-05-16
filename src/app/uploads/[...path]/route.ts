import { NextRequest, NextResponse } from "next/server";
import { readLocalFile, sanitizeUploadPath } from "@/lib/storage/local";

const CONTENT_TYPES: Record<string, string> = {
    ".avif": "image/avif",
    ".gif": "image/gif",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
};

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    try {
        const { path } = await params;
        const filePath = sanitizeUploadPath(path.join("/"));
        const data = await readLocalFile(filePath);
        const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
        return new NextResponse(data, {
            headers: {
                "content-type": CONTENT_TYPES[ext] || "application/octet-stream",
                "cache-control": "public, max-age=3600",
            },
        });
    } catch {
        return new NextResponse("Not found", { status: 404 });
    }
}
