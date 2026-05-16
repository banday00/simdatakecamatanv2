import type { AppSessionUser } from "@/lib/auth/types";

declare module "next-auth" {
    interface Session {
        user: AppSessionUser;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        user?: AppSessionUser;
    }
}
