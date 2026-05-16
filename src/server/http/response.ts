import "server-only";

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { isAppError } from "./errors";

type Meta = Record<string, unknown>;

export function ok<T>(data: T, meta?: Meta) {
    return NextResponse.json({ data, error: null, ...(meta ? { meta } : {}) });
}

export function created<T>(data: T, meta?: Meta) {
    return NextResponse.json({ data, error: null, ...(meta ? { meta } : {}) }, { status: 201 });
}

export function fail(status: number, message: string, code = "ERROR") {
    return NextResponse.json({ data: null, error: { message, code } }, { status });
}

export function handleApiError(error: unknown) {
    if (isAppError(error)) {
        return fail(error.status, error.message, error.code);
    }

    if (error instanceof ZodError) {
        return fail(400, error.issues[0]?.message ?? "Input tidak valid.", "VALIDATION_ERROR");
    }

    console.error("[API]", error);
    return fail(500, "Terjadi kesalahan server.", "INTERNAL_SERVER_ERROR");
}

