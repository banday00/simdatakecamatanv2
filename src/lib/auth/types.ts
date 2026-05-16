import type { UserProfile } from "@/types";

export type AppUser = {
    id: string;
    email: string;
    passwordChangedAt: string | null;
    passwordResetRequired: boolean;
    updatedAt: string | null;
};

export type AppSessionUser = AppUser & UserProfile & {
    profile: UserProfile;
};
