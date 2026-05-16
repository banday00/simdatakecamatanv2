import "server-only";

import { AppError } from "@/server/http/errors";

type Bucket = {
    count: number;
    resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function assertRateLimit(key: string, limit: number, windowMs: number) {
    const now = Date.now();
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return;
    }

    current.count += 1;
    if (current.count > limit) {
        throw new AppError(429, "Terlalu banyak percobaan. Coba lagi nanti.", "RATE_LIMITED");
    }
}

