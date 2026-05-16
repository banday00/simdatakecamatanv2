import "server-only";

import { mkdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";

const SEGMENT_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

export function uploadRoot() {
    return process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
}

export function uploadBaseUrl() {
    return (process.env.NEXT_PUBLIC_UPLOAD_BASE_URL || "/uploads").replace(/\/$/, "");
}

export function sanitizeUploadPath(input: string) {
    const normalized = input.replace(/\\/g, "/").split("/").filter(Boolean);
    if (!normalized.length || normalized.some((segment) => segment === "." || segment === ".." || !SEGMENT_RE.test(segment))) {
        throw new Error("Invalid upload path");
    }
    return normalized.join("/");
}

export function absoluteUploadPath(input: string) {
    return path.join(uploadRoot(), sanitizeUploadPath(input));
}

export async function saveLocalFile(filePath: string, file: File) {
    const safePath = sanitizeUploadPath(filePath);
    const target = absoluteUploadPath(safePath);
    await mkdir(path.dirname(target), { recursive: true });
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(target, bytes);
    return {
        path: safePath,
        publicUrl: `${uploadBaseUrl()}/${safePath}`,
    };
}

export async function readLocalFile(filePath: string) {
    return readFile(absoluteUploadPath(filePath));
}

export async function deleteLocalFile(filePath: string) {
    await rm(absoluteUploadPath(filePath), { force: true });
}

export function getLocalPublicUrl(filePath: string) {
    return `${uploadBaseUrl()}/${sanitizeUploadPath(filePath)}`;
}
