"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
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
    const [isLoading, setIsLoading] = useState(!initialTenant);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (initialTenant) {
            loadKelurahans(initialTenant.id);
            return;
        }

        async function loadTenant() {
            try {
                const supabase = createClient();
                const slug =
                    process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG || "bogorutara";

                const { data, error: fetchError } = await supabase
                    .from("tenants")
                    .select("*")
                    .eq("slug", slug)
                    .eq("is_active", true)
                    .single();

                if (fetchError) throw fetchError;
                setTenant(data as Tenant);
                await loadKelurahans(data.id);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load tenant");
            } finally {
                setIsLoading(false);
            }
        }

        loadTenant();
    }, [initialTenant]);

    async function loadKelurahans(tenantId: string) {
        try {
            const supabase = createClient();
            const { data } = await supabase
                .from("kelurahans")
                .select("*")
                .eq("tenant_id", tenantId)
                .eq("is_active", true)
                .order("nama");

            setKelurahans((data as Kelurahan[]) || []);
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
