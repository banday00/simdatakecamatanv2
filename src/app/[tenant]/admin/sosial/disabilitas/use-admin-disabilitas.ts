"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTenant } from "@/lib/tenant/context";

export type BantuanEntry = {
    bantuan_id: string;
    nama_bantuan: string;
    status_penerima: boolean;
    keterangan: string | null;
};

export type DisabilitasRow = {
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
    disabilitas_id: string;
    nama_disabilitas: string;
    keterangan_disabilitas: string | null;
    bantuan_list: BantuanEntry[];
    created_at: string;
    // Enriched
    kelurahan_nama?: string;
    usia?: number | null;
};

export type MasterDisabilitas = { id: string; nama_disabilitas: string; keterangan: string | null };
export type MasterBantuan = { id: string; nama_bantuan: string; keterangan: string | null };

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

function calculateAge(dateStr: string | null): number | null {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
    return age;
}

export function useAdminDisabilitas() {
    const { tenant, kelurahans } = useTenant();
    const [data, setData] = useState<DisabilitasRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [masterDisabilitas, setMasterDisabilitas] = useState<MasterDisabilitas[]>([]);
    const [masterBantuan, setMasterBantuan] = useState<MasterBantuan[]>([]);

    const apiBase = `/api/tenants/${tenant?.slug}/admin/sosial/disabilitas`;

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
            const rows = (json.data || []).map((r: DisabilitasRow) => ({
                ...r,
                kelurahan_nama: kelMap.get(r.kelurahan_id) || "-",
                usia: calculateAge(r.tanggal_lahir),
                bantuan_list: typeof r.bantuan_list === "string" ? JSON.parse(r.bantuan_list) : r.bantuan_list || [],
            }));
            setData(rows);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [tenant?.slug, apiBase, kelMap]);

    // Fetch master data
    const fetchMaster = useCallback(async () => {
        if (!tenant?.slug) return;
        try {
            const res = await fetch(`${apiBase}/master`, { cache: "no-store" });
            const json = await res.json();
            if (!res.ok || json.error) return;
            setMasterDisabilitas(json.data?.masterDisabilitas || []);
            setMasterBantuan(json.data?.masterBantuan || []);
        } catch { /* silent */ }
    }, [tenant?.slug, apiBase]);

    useEffect(() => {
        fetchData();
        fetchMaster();
    }, [fetchData, fetchMaster]);

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
        const lakiLaki = data.filter(r => r.jenis_kelamin && ["L", "Laki-laki"].includes(r.jenis_kelamin)).length;
        const perempuan = data.filter(r => r.jenis_kelamin && ["P", "Perempuan"].includes(r.jenis_kelamin)).length;
        const penerimaBantuan = data.filter(r => r.bantuan_list && r.bantuan_list.length > 0).length;
        const jenisTerbanyak = data.length > 0
            ? Object.entries(
                data.reduce((acc, r) => {
                    const k = r.nama_disabilitas || "Lainnya";
                    acc[k] = (acc[k] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>)
              ).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-"
            : "-";
        return { total, lakiLaki, perempuan, penerimaBantuan, jenisTerbanyak };
    }, [data]);

    return {
        data,
        isLoading,
        error,
        masterDisabilitas,
        masterBantuan,
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
