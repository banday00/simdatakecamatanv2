import "server-only";

import { z } from "zod";
import { userRoleSchema, uuidSchema } from "@/server/validation/common";

const nullableText = z
    .string()
    .trim()
    .max(160)
    .optional()
    .nullable()
    .transform((value) => value || null);

export const createUserSchema = z.object({
    email: z.email("Email tidak valid.").trim().toLowerCase(),
    password: z.string().min(8, "Password minimal 8 karakter.").max(128),
    nama_lengkap: z.string().trim().min(2, "Nama minimal 2 karakter.").max(160),
    nip: nullableText,
    jabatan: nullableText,
    role: userRoleSchema,
    kelurahan_id: uuidSchema.nullable().optional(),
    is_active: z.boolean().default(true),
});

export const updateUserSchema = z.object({
    nama_lengkap: z.string().trim().min(2, "Nama minimal 2 karakter.").max(160),
    nip: nullableText,
    jabatan: nullableText,
    role: userRoleSchema,
    kelurahan_id: uuidSchema.nullable().optional(),
    is_active: z.boolean(),
});

export const updateUserPasswordSchema = z.object({
    password: z.string().min(8, "Password minimal 8 karakter.").max(128),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateUserPasswordInput = z.infer<typeof updateUserPasswordSchema>;

