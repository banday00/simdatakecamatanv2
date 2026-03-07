"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "@/lib/tenant/context";
import { useAuth } from "@/lib/auth/context";

type UseCrudOptions = {
    table: string;
    schema?: string;
    orderBy?: string;
    /** Set false to skip auto kelurahan filter for admin_kelurahan (default: true) */
    autoFilterKelurahan?: boolean;
};

export function useCrud<T extends Record<string, unknown>>(options: UseCrudOptions) {
    const { table, schema = "sidakota", orderBy = "created_at", autoFilterKelurahan = true } = options;
    const { tenant } = useTenant();
    const { profile } = useAuth();
    const [data, setData] = useState<T[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();

    // Determine kelurahan filter
    const isKelurahanAdmin = profile?.role === "admin_kelurahan" && !!profile?.kelurahan_id;
    const filterKelurahanId = autoFilterKelurahan && isKelurahanAdmin ? profile.kelurahan_id : null;

    const fetchData = useCallback(async () => {
        if (!tenant?.id) return;
        setIsLoading(true);
        setError(null);
        try {
            let query = supabase
                .schema(schema)
                .from(table)
                .select("*")
                .eq("tenant_id", tenant.id)
                .order(orderBy, { ascending: false });

            // Auto-filter by kelurahan for admin_kelurahan
            if (filterKelurahanId) {
                query = query.eq("kelurahan_id", filterKelurahanId);
            }

            const { data: rows, error: fetchError } = await query;
            if (fetchError) throw fetchError;
            setData((rows as T[]) || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Gagal memuat data");
        } finally {
            setIsLoading(false);
        }
    }, [tenant?.id, table, schema, orderBy, filterKelurahanId, supabase]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    async function create(record: Partial<T>) {
        if (!tenant?.id) throw new Error("Tenant not set");
        const payload: Record<string, unknown> = { ...record, tenant_id: tenant.id };
        // Auto-inject kelurahan_id for admin_kelurahan
        if (filterKelurahanId && !payload.kelurahan_id) {
            payload.kelurahan_id = filterKelurahanId;
        }
        const { error } = await supabase
            .schema(schema)
            .from(table)
            .insert(payload);
        if (error) throw error;
        await fetchData();
    }

    async function update(id: string, record: Partial<T>) {
        const { error } = await supabase
            .schema(schema)
            .from(table)
            .update(record)
            .eq("id", id);
        if (error) throw error;
        await fetchData();
    }

    async function remove(id: string) {
        const { error } = await supabase
            .schema(schema)
            .from(table)
            .delete()
            .eq("id", id);
        if (error) throw error;
        await fetchData();
    }

    return { data, isLoading, error, fetchData, create, update, remove, isKelurahanAdmin, filterKelurahanId };
}
