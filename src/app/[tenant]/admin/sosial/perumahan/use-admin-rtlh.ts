"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTenant } from "@/lib/tenant/context";

export type RtlhRow = {
    id: string;
    penduduk_id: string;
    nik: string;
    nama: string;
    jenis_kelamin: string | null;
    tanggal_lahir: string | null;
    no_kk: string | null;
    alamat: string | null;
    rt: string | null;
    rw: string | null;
    kelurahan_id: string;
    tahun: number;
    kategori: string;
    created_at: string;
    // Enriched
    kelurahan_nama?: string;
};

export type SearchResult = {
    penduduk_id: string;
    nik: string;
    nama: string;
    jenis_kelamin: string | null;
    tanggal_lahir: string | null;
    tempat_lahir: string | null;
    keluarga_id: string;
    no_kk: string | null;
    alamat: string | null;
    rt: string | null;
    rw: string | null;
    kelurahan_id: string;
} | null;

export function useAdminRtlh() {
    const { tenant, kelurahans } = useTenant();
    const [data, setData] = useState<RtlhRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const apiBase = `/api/tenants/${tenant?.slug}/admin/sosial/perumahan`;

    const kelMap = useMemo(
        () => new Map((kelurahans || []).map((k: any) => [k.id, k.nama])),
        [kelurahans]
    );

    // Fetch list data
    const fetchData = useCallback(async () => {
        if (!tenant?.slug) return;
        try {
            setIsLoading(true);
            setError(null);
            const res = await fetch(apiBase, { cache: "no-store" });
            const json = await res.json();
            if (!res.ok || json.error) throw new Error(json.error?.message || "Gagal memuat data.");
            const rows = (json.data || []).map((r: RtlhRow) => ({
                ...r,
                kelurahan_nama: kelMap.get(r.kelurahan_id) || "-",
            }));
            setData(rows);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [tenant?.slug, apiBase, kelMap]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Search NIK
    const searchNIK = useCallback(async (nik: string): Promise<SearchResult> => {
        if (!tenant?.slug || nik.length < 16) return null;
        try {
            const res = await fetch(`${apiBase}/search?nik=${nik}`, { cache: "no-store" });
            const json = await res.json();
            if (!res.ok || json.error) return null;
            return json.data || null;
        } catch { return null; }
    }, [tenant?.slug, apiBase]);

    // Create
    const createEntry = useCallback(async (payload: Record<string, unknown>) => {
        const res = await fetch(apiBase, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok || json.error) throw new Error(json.error?.message || "Gagal menyimpan data.");
        await fetchData();
        return json.data;
    }, [apiBase, fetchData]);

    // Update
    const updateEntry = useCallback(async (id: string, payload: Record<string, unknown>) => {
        const res = await fetch(`${apiBase}/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok || json.error) throw new Error(json.error?.message || "Gagal menyimpan data.");
        await fetchData();
        return json.data;
    }, [apiBase, fetchData]);

    // Delete
    const deleteEntry = useCallback(async (id: string) => {
        const res = await fetch(`${apiBase}/${id}`, { method: "DELETE" });
        const json = await res.json();
        if (!res.ok || json.error) throw new Error(json.error?.message || "Gagal menghapus data.");
        await fetchData();
        return json.data;
    }, [apiBase, fetchData]);

    // Stats
    const stats = useMemo(() => {
        const total = data.length;
        const tunai = data.filter(r => r.kategori === "Bantuan Sosial Tunai").length;
        const tidakTerencana = data.filter(r => r.kategori === "Bantuan Sosial Tidak Terencana").length;
        const latestYear = data.reduce((max, r) => Math.max(max, Number(r.tahun) || 0), 0);
        return { total, tunai, tidakTerencana, latestYear };
    }, [data]);

    return {
        data,
        isLoading,
        error,
        kelMap,
        kelurahans: kelurahans || [],
        stats,
        fetchData,
        searchNIK,
        createEntry,
        updateEntry,
        deleteEntry,
    };
}
