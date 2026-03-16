"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "@/lib/tenant/context";
import { useAuth } from "@/lib/auth/context";
import { logActivity } from "@/lib/activity-logger";

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
    // Track last modified record to move it to the top after fetch
    const [lastModifiedId, setLastModifiedId] = useState<string | null>(null);

    // Stabilize Supabase client: createClient() once, not on every render
    const [supabase] = useState(() => createClient());

    // Determine kelurahan filter — use optional chain to avoid crash when profile is null
    const isKelurahanAdmin = profile?.role === "admin_kelurahan" && !!profile?.kelurahan_id;
    const filterKelurahanId = autoFilterKelurahan && isKelurahanAdmin ? (profile?.kelurahan_id ?? null) : null;

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
            console.error(`[useCrud] fetchData (${table}):`, err);
        } finally {
            setIsLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tenant?.id, table, schema, orderBy, filterKelurahanId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Move last modified record to top of list whenever data or lastModifiedId changes
    useEffect(() => {
        if (!lastModifiedId) return;
        setData((prev) => {
            const idx = prev.findIndex((r) => (r as Record<string, unknown>).id === lastModifiedId);
            if (idx <= 0) return prev; // already at top or not found
            const item = prev[idx];
            return [item, ...prev.slice(0, idx), ...prev.slice(idx + 1)];
        });
        setLastModifiedId(null);
    }, [lastModifiedId, data]);

    async function create(record: Partial<T>) {
        if (!tenant?.id) throw new Error("Tenant not set");
        const payload: Record<string, unknown> = { ...record, tenant_id: tenant.id };
        // Always enforce kelurahan_id for admin_kelurahan — override any form value
        if (filterKelurahanId) {
            payload.kelurahan_id = filterKelurahanId;
        }
        const { data: inserted, error } = await supabase
            .schema(schema)
            .from(table)
            .insert(payload)
            .select("id");
        if (error) throw error;
        // Log activity (fire-and-forget)
        logActivity({
            action: "create",
            module: table,
            recordTable: table,
            detail: `Tambah data di ${table}`,
            tenantId: tenant.id,
            userId: profile?.id,
            userEmail: undefined,
            userName: profile?.nama_lengkap || undefined,
        });
        await fetchData();
        // Move newly created record to top
        if (inserted?.[0]?.id) setLastModifiedId(inserted[0].id as string);
    }

    async function update(id: string, record: Partial<T>) {
        if (!tenant?.id) throw new Error("Tenant not set");
        const { tenant_id: _tid, ...updatePayload } = record as Record<string, unknown>;
        const { error } = await supabase
            .schema(schema)
            .from(table)
            .update(updatePayload)
            .eq("id", id)
            .eq("tenant_id", tenant.id);
        if (error) throw error;
        logActivity({
            action: "update",
            module: table,
            recordTable: table,
            recordId: id,
            detail: `Edit data di ${table}`,
            tenantId: tenant.id,
            userId: profile?.id,
            userEmail: undefined,
            userName: profile?.nama_lengkap || undefined,
        });
        await fetchData();
        // Move updated record to top
        setLastModifiedId(id);
    }

    async function remove(id: string) {
        if (!tenant?.id) throw new Error("Tenant not set");
        const { error } = await supabase
            .schema(schema)
            .from(table)
            .delete()
            .eq("id", id)
            .eq("tenant_id", tenant.id);
        if (error) throw error;
        logActivity({
            action: "delete",
            module: table,
            recordTable: table,
            recordId: id,
            detail: `Hapus data di ${table}`,
            tenantId: tenant.id,
            userId: profile?.id,
            userEmail: undefined,
            userName: profile?.nama_lengkap || undefined,
        });
        await fetchData();
    }

    return { data, isLoading, error, fetchData, create, update, remove, isKelurahanAdmin, filterKelurahanId };
}
