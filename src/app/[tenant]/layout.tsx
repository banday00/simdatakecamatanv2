import { notFound } from "next/navigation";
import { AuthProvider } from "@/lib/auth/context";
import { TenantProvider } from "@/lib/tenant/context";
import { getTenantBySlug } from "@/lib/tenant/server";

export default async function TenantLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ tenant: string }>;
}) {
    const { tenant: tenantSlug } = await params;
    const tenant = await getTenantBySlug(tenantSlug);

    if (!tenant) {
        notFound();
    }

    return (
        <TenantProvider initialTenant={tenant}>
            <AuthProvider>{children}</AuthProvider>
        </TenantProvider>
    );
}
