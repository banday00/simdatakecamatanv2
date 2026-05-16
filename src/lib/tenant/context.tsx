"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    type ReactNode,
} from "react";
import type { Tenant, Kelurahan } from "@/types";

type TenantContextType = {
    tenant: Tenant | null;
    kelurahans: Kelurahan[];
    isLoading: boolean;
    error: string | null;
};

const TenantContext = createContext<TenantContextType>({
    tenant: null,
    kelurahans: [],
    isLoading: true,
    error: null,
});

export function TenantProvider({
    children,
    initialTenant,
}: {
    children: ReactNode;
    initialTenant?: Tenant | null;
}) {
    const [tenant, setTenant] = useState<Tenant | null>(initialTenant ?? null);
    const [kelurahans, setKelurahans] = useState<Kelurahan[]>([]);
    const [isLoading, setIsLoading] = useState(!!initialTenant);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (initialTenant) {
            setTenant(initialTenant);
            setError(null);
            setIsLoading(true);
            loadKelurahans(initialTenant.slug);
            return;
        }

        setTenant(null);
        setKelurahans([]);
        setError("Tenant not set");
        setIsLoading(false);
    }, [initialTenant]);

    async function loadKelurahans(tenantSlug: string) {
        try {
            const response = await fetch(`/api/tenants/${tenantSlug}/kelurahans`, { cache: "no-store" });
            const result = await response.json();
            if (!response.ok || result.error || !result.data) {
                throw new Error(result.error?.message ?? "Gagal memuat kelurahan.");
            }

            setKelurahans((result.data as Kelurahan[]) || []);
        } catch {
            // Non-critical error
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <TenantContext.Provider value={{ tenant, kelurahans, isLoading, error }}>
            {children}
        </TenantContext.Provider>
    );
}

export function useTenant() {
    const context = useContext(TenantContext);
    if (!context) {
        throw new Error("useTenant must be used within TenantProvider");
    }
    return context;
}
