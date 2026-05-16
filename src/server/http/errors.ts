import "server-only";

export class AppError extends Error {
    constructor(
        public readonly status: number,
        message: string,
        public readonly code = "APP_ERROR"
    ) {
        super(message);
    }
}

export function isAppError(error: unknown): error is AppError {
    return error instanceof AppError;
}

