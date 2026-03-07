import { createClient } from "@/lib/supabase/client";

type UploadOptions = {
    bucket: string;
    path: string;
    file: File;
    upsert?: boolean;
};

/**
 * Upload file to Supabase Storage bucket
 */
export async function uploadFile({ bucket, path, file, upsert = false }: UploadOptions) {
    const supabase = createClient();
    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
            cacheControl: "3600",
            upsert,
        });

    if (error) throw error;
    return data;
}

/**
 * Get public URL for a file in a bucket
 */
export function getPublicUrl(bucket: string, path: string): string {
    const supabase = createClient();
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
}

/**
 * Delete file from bucket
 */
export async function deleteFile(bucket: string, path: string) {
    const supabase = createClient();
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) throw error;
}

/**
 * Build the tenant-scoped storage path
 * e.g., "bogorutara/cibuluh/profiles/foto.jpg"
 */
export function buildStoragePath(
    tenantSlug: string,
    kelurahanSlug: string | null,
    folder: string,
    fileName: string
): string {
    const parts = [tenantSlug];
    if (kelurahanSlug) parts.push(kelurahanSlug);
    parts.push(folder, fileName);
    return parts.join("/");
}
