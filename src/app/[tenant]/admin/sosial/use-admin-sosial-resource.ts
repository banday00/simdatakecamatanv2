"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { useTenant } from "@/lib/tenant/context";

type RowBase = {
    id: string;
    kelurahan_id: string;
};

export function useAdminSosialResource<T extends RowBase>(resource: string, errorLabel: string) {
    const { tenant, kelurahans } = useTenant();
    const { profile } = useAuth();
    const [data, setData] = useState<T[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const apiBase = tenant?.slug ? `/api/tenants/${tenant.slug}/admin/sosial/${resource}` : "";

    const kelurahanOptions = useMemo(() => {
        const allowedKelurahanId = profile?.role === "admin_kelurahan" ? profile?.kelurahan_id : null;
        return kelurahans
            .filter((kelurahan) => !allowedKelurahanId || kelurahan.id === allowedKelurahanId)
            .map((kelurahan) => ({ label: kelurahan.nama, value: kelurahan.id }));
    }, [kelurahans, profile?.kelurahan_id, profile?.role]);

    const kelMap = useMemo(() => {
        const map = new Map<string, string>();
        kelurahans.forEach((kelurahan) => map.set(kelurahan.id, kelurahan.nama));
        return map;
    }, [kelurahans]);

    const fetchData = useCallback(async () => {
        if (!apiBase) return;
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(apiBase, { cache: "no-store" });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error?.message || `Gagal memuat ${errorLabel}.`);
            setData(json.data ?? []);
        } catch (err) {
            setError(err instanceof Error ? err.message : `Gagal memuat ${errorLabel}.`);
        } finally {
            setIsLoading(false);
        }
    }, [apiBase, errorLabel]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    async function createRow(payload: Record<string, unknown>) {
        const res = await fetch(apiBase, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error?.message || `Gagal menyimpan ${errorLabel}.`);
        await fetchData();
        return json.data as T;
    }

    async function updateRow(id: string, payload: Record<string, unknown>) {
        const res = await fetch(`${apiBase}/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error?.message || `Gagal menyimpan ${errorLabel}.`);
        await fetchData();
        return json.data as T;
    }

    async function deleteRow(id: string) {
        const res = await fetch(`${apiBase}/${id}`, { method: "DELETE" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error?.message || `Gagal menghapus ${errorLabel}.`);
        await fetchData();
        return json.data as T;
    }

    return {
        data,
        isLoading,
        error,
        kelurahanOptions,
        kelMap,
        createRow,
        updateRow,
        deleteRow,
    };
}
