import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "../../../../auth";
import { deleteLocalFile, saveLocalFile } from "@/lib/storage/local";
import { getTenantBySlug } from "@/server/db/tenant";
import { requireTenantAccess } from "@/server/auth/guards";
import { assertRateLimit } from "@/server/security/rate-limit";
import { isAppError } from "@/server/http/errors";
import type { UserProfile } from "@/types";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]);

const uploadPathSchema = z
    .string()
    .trim()
    .min(3, "path is required")
    .max(240, "path is too long")
    .refine((value) => !value.includes("\\") && !value.includes(".."), "Invalid upload path");

async function enforceTenantPathAccess(filePath: string, profile: UserProfile) {
    const firstSegment = filePath.split("/").filter(Boolean)[0];
    if (!firstSegment) return;

    try {
        const tenant = await getTenantBySlug(firstSegment);
        requireTenantAccess(profile, tenant.id);
    } catch (error) {
        if (isAppError(error) && error.code === "TENANT_NOT_FOUND") {
            // Legacy bucket-style paths are still allowed during phased migration.
            return;
        }
        throw error;
    }
}

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.profile?.is_active) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const parsedPath = uploadPathSchema.safeParse(String(formData.get("path") ?? ""));

    if (!(file instanceof File) || !parsedPath.success) {
        return NextResponse.json({ error: "file and path are required" }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
        return NextResponse.json({ error: "Ukuran file maksimal 5MB" }, { status: 400 });
    }
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
        return NextResponse.json({ error: "Tipe file tidak diizinkan" }, { status: 400 });
    }

    try {
        assertRateLimit(`upload:${session.user.id}`, 30, 60 * 1000);
        await enforceTenantPathAccess(parsedPath.data, session.user.profile);
        const data = await saveLocalFile(parsedPath.data, file);
        return NextResponse.json({ data, error: null });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        return NextResponse.json({ data: null, error: message }, { status: 400 });
    }
}

export async function DELETE(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.profile?.is_active) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const parsedPath = uploadPathSchema.safeParse(searchParams.get("path") ?? "");
    if (!parsedPath.success) {
        return NextResponse.json({ error: "path is required" }, { status: 400 });
    }

    try {
        assertRateLimit(`upload-delete:${session.user.id}`, 30, 60 * 1000);
        await enforceTenantPathAccess(parsedPath.data, session.user.profile);
        await deleteLocalFile(parsedPath.data);
        return NextResponse.json({ data: true, error: null });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Delete failed";
        return NextResponse.json({ data: null, error: message }, { status: 400 });
    }
}
