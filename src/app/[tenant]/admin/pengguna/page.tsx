"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTenant } from "@/lib/tenant/context";
import { useAuth } from "@/lib/auth/context";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DeleteConfirm } from "@/components/ui/delete-confirm";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
    Users, UserCheck, Shield, ShieldCheck, Plus, Edit, Trash2,
    Loader2, X, Save, Mail, Briefcase, MapPin, KeyRound,
} from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────── */
type UserRow = Record<string, unknown> & {
    id: string;
    email: string;
    tenant_id: string;
    kelurahan_id: string | null;
    nama_lengkap: string;
    nip: string | null;
    jabatan: string | null;
    foto: string | null;
    role: "super_admin" | "admin_kecamatan" | "admin_kelurahan";
    is_active: boolean;
    last_login: string | null;
    created_at?: string;
};

/* ─── Columns ────────────────────────────────────────────────── */
const columns: Column<UserRow>[] = [
    { key: "nama_lengkap", label: "Nama Lengkap", sortable: true },
    {
        key: "role", label: "Role", sortable: true,
        render(val) {
            const r = String(val);
            const map: Record<string, { label: string; cls: string }> = {
                super_admin: { label: "Super Admin", cls: "bg-purple-100 text-purple-700" },
                admin_kecamatan: { label: "Admin Kecamatan", cls: "bg-blue-100 text-blue-700" },
                admin_kelurahan: { label: "Admin Kelurahan", cls: "bg-emerald-100 text-emerald-700" },
            };
            const m = map[r] || { label: r, cls: "bg-gray-100 text-gray-600" };
            return <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${m.cls}`}>{m.label}</span>;
        }
    },
    {
        key: "nip", label: "NIP",
        render(val) { return val ? String(val) : <span className="text-gray-300">—</span>; }
    },
    {
        key: "jabatan", label: "Jabatan",
        render(val) { return val ? String(val) : <span className="text-gray-300">—</span>; }
    },
    {
        key: "is_active", label: "Status",
        render(val) {
            return val
                ? <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-100 text-green-700">Aktif</span>
                : <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-100 text-red-700">Nonaktif</span>;
        }
    },
    {
        key: "last_login", label: "Login Terakhir", sortable: true,
        render(val) {
            return val ? new Date(String(val)).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : <span className="text-gray-300">Belum pernah</span>;
        }
    },
];

/* ─── Main Page ──────────────────────────────────────────────── */
export default function PenggunaAdminPage() {
    const { tenant, kelurahans } = useTenant();
    const { profile } = useAuth();

    const [data, setData] = useState<UserRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editRow, setEditRow] = useState<UserRow | null>(null);
    const [deleteRow, setDeleteRow] = useState<UserRow | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isAuthorized = profile?.role === "admin_kecamatan" || profile?.role === "super_admin";

    const fetchUsers = useCallback(async () => {
        if (!tenant?.slug || !isAuthorized) return;
        setIsLoading(true);
        try {
            const res = await fetch(`/api/tenants/${tenant.slug}/admin/users`);
            const json = await res.json();
            if (!res.ok || json.error) {
                throw new Error(json.error?.message || json.error || "Gagal memuat pengguna");
            }
            setData((json.data as UserRow[]) || []);
        } catch (err) {
            console.error("[Pengguna] fetchUsers:", err);
            setData([]);
        } finally { setIsLoading(false); }
    }, [tenant?.slug, isAuthorized]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    if (profile && !isAuthorized) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                <Shield className="w-16 h-16 text-slate-300 mb-4" />
                <h2 className="text-xl font-bold text-slate-700">Akses Ditolak</h2>
                <p className="text-slate-500 mt-2">Anda tidak memiliki izin untuk mengakses halaman manajemen pengguna.</p>
            </div>
        );
    }

    /* stats */
    const totalUsers = data.length;
    const adminKec = data.filter(d => d.role === "admin_kecamatan").length;
    const adminKel = data.filter(d => d.role === "admin_kelurahan").length;
    const activeUsers = data.filter(d => d.is_active).length;

    /* handlers */
    async function handleSubmit(formData: Record<string, unknown>) {
        if (!tenant?.slug) return;
        setIsSubmitting(true);
        try {
            if (editRow) {
                const updatePayload: Record<string, unknown> = {
                    nama_lengkap: formData.nama_lengkap,
                    nip: formData.nip || null,
                    jabatan: formData.jabatan || null,
                    role: formData.role,
                    kelurahan_id: formData.role === "admin_kelurahan" ? formData.kelurahan_id : null,
                    is_active: formData.is_active === "true" || formData.is_active === true,
                };
                const res = await fetch(`/api/tenants/${tenant.slug}/admin/users/${editRow.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(updatePayload),
                });
                const result = await res.json();
                if (!res.ok || result.error) {
                    throw new Error(result.error?.message || result.error || `HTTP ${res.status}`);
                }

                if (formData.password && String(formData.password).trim() !== "") {
                    const pwdRes = await fetch(`/api/tenants/${tenant.slug}/admin/users/${editRow.id}/password`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            password: formData.password
                        })
                    });
                    const pwdResult = await pwdRes.json();
                    if (!pwdRes.ok || pwdResult.error) {
                        throw new Error(pwdResult.error?.message || pwdResult.error || `Gagal ganti password HTTP ${pwdRes.status}`);
                    }
                }
            } else {
                const res = await fetch(`/api/tenants/${tenant.slug}/admin/users`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: formData.email,
                        password: formData.password,
                        nama_lengkap: formData.nama_lengkap,
                        nip: formData.nip || null,
                        jabatan: formData.jabatan || null,
                        role: formData.role,
                        kelurahan_id: formData.role === "admin_kelurahan" ? formData.kelurahan_id : null,
                        is_active: true,
                    }),
                });
                const result = await res.json();
                if (!res.ok || result.error) {
                    throw new Error(result.error?.message || result.error || `HTTP ${res.status}`);
                }
            }
            setModalOpen(false);
            setEditRow(null);
            await fetchUsers();
        } catch (err: any) {
            console.error("[handleSubmit] error:", err);
            alert("Gagal menyimpan data:\n" + (err.message || JSON.stringify(err)));
        } finally { setIsSubmitting(false); }
    }

    async function handleDelete() {
        if (!deleteRow || !tenant?.slug) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/tenants/${tenant.slug}/admin/users/${deleteRow.id}`, { method: "DELETE" });
            const result = await res.json();
            if (!res.ok || result.error) {
                throw new Error(result.error?.message || result.error);
            }
            setDeleteRow(null);
            await fetchUsers();
        } catch (err: any) {
            alert(err.message || "Gagal menghapus");
        } finally { setIsSubmitting(false); }
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Manajemen Pengguna"
                description="Kelola akun admin kecamatan dan kelurahan"
            />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Pengguna" value={totalUsers} icon={Users} gradient="stat-gradient-soft-blue" />
                <StatCard label="Admin Kecamatan" value={adminKec} icon={ShieldCheck} gradient="stat-gradient-soft-indigo" />
                <StatCard label="Admin Kelurahan" value={adminKel} icon={Shield} gradient="stat-gradient-soft-emerald" />
                <StatCard label="Pengguna Aktif" value={activeUsers} icon={UserCheck} gradient="stat-gradient-soft-amber" />
            </div>

            <DataTable<UserRow>
                data={data}
                columns={columns}
                isLoading={isLoading}
                onAdd={() => { setEditRow(null); setModalOpen(true); }}
                onEdit={(row) => { setEditRow(row); setModalOpen(true); }}
                onDelete={(row) => setDeleteRow(row)}
                addLabel="Tambah Pengguna"
            />

            {/* Form Modal */}
            <PenggunaFormModal
                open={modalOpen}
                onClose={() => { setModalOpen(false); setEditRow(null); }}
                onSubmit={handleSubmit}
                editRow={editRow}
                isSubmitting={isSubmitting}
                kelurahans={kelurahans}
            />

            {/* Delete Confirm */}
            <DeleteConfirm
                open={!!deleteRow}
                onClose={() => setDeleteRow(null)}
                onConfirm={handleDelete}
                title="Hapus Pengguna"
                message={`Hapus pengguna "${deleteRow?.nama_lengkap}"? Akun dan semua data profil akan dihapus permanen.`}
                isDeleting={isSubmitting}
            />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   PenggunaFormModal — Custom Form (Blue Gradient)
   ═══════════════════════════════════════════════════════════════ */
function PenggunaFormModal({ open, onClose, onSubmit, editRow, isSubmitting, kelurahans }: {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: Record<string, unknown>) => Promise<void>;
    editRow: UserRow | null;
    isSubmitting: boolean;
    kelurahans: { id: string; nama: string }[];
}) {
    const isEdit = !!editRow;
    const [form, setForm] = useState<Record<string, unknown>>({
        nama_lengkap: "", email: "", password: "", nip: "", jabatan: "",
        role: "admin_kelurahan", kelurahan_id: "", is_active: "true",
    });
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordStrength, setPasswordStrength] = useState({ score: 0, text: "", color: "bg-gray-200" });

    useEffect(() => {
        if (!open) return;
        if (editRow) {
            setForm({
                nama_lengkap: editRow.nama_lengkap || "",
                email: "", // can't change email
                password: "", // can't change password directly
                nip: editRow.nip || "",
                jabatan: editRow.jabatan || "",
                role: editRow.role || "admin_kelurahan",
                kelurahan_id: editRow.kelurahan_id || "",
                is_active: editRow.is_active ? "true" : "false",
            });
        } else {
            setForm({
                nama_lengkap: "", email: "", password: "", nip: "", jabatan: "",
                role: "admin_kelurahan", kelurahan_id: "", is_active: "true",
            });
            setConfirmPassword("");
            setPasswordStrength({ score: 0, text: "", color: "bg-gray-200" });
        }
    }, [open, editRow]);

    function set(field: string, value: any) {
        setForm(p => ({ ...p, [field]: value }));

        // Calculate password strength
        if (field === "password") {
            const pwd = String(value);
            let score = 0;
            if (pwd.length > 5) score += 1;
            if (pwd.length > 8) score += 1;
            if (/[A-Z]/.test(pwd)) score += 1;
            if (/[0-9]/.test(pwd)) score += 1;
            if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

            if (pwd.length === 0) setPasswordStrength({ score: 0, text: "", color: "bg-gray-200" });
            else if (score <= 2) setPasswordStrength({ score, text: "Lemah", color: "bg-red-500" });
            else if (score <= 4) setPasswordStrength({ score, text: "Sedang", color: "bg-amber-400" });
            else setPasswordStrength({ score, text: "Kuat", color: "bg-emerald-500" });
        }
    }

    if (!open) return null;

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validation for new user OR editing user with password change
        const isPasswordBeingSet = !isEdit || (isEdit && String(form.password).length > 0);

        if (isPasswordBeingSet) {
            if (passwordStrength.score < 5) {
                alert("Password terlalu lemah. Gunakan kombinasi huruf besar, angka, dan simbol hingga indikator menunjukkan 'Kuat'.");
                return;
            }
            if (String(form.password) !== confirmPassword) {
                alert("Password dan Konfirmasi Password tidak cocok!");
                return;
            }
        }

        onSubmit(form);
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md transition-opacity" onClick={onClose} />
            <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden" style={{ animation: "modalSlideIn 0.3s ease-out" }}>
                {/* Gradient accent */}
                <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 shrink-0" />

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 md:px-8 border-b border-gray-100 shrink-0 bg-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{isEdit ? "Edit Pengguna" : "Tambah Pengguna Baru"}</h2>
                            <p className="text-sm text-gray-500 mt-0.5">Kelola akses pengguna dashboard SIMDATA Kecamatan</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleFormSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="p-6 md:p-8 overflow-y-auto bg-slate-50/30">
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

                            {/* Left Column — Identity */}
                            <div className="lg:col-span-2 space-y-5">
                                <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                                    <Briefcase className="w-4 h-4 text-blue-500" />
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Identitas Pengguna</span>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nama Lengkap <span className="text-red-500">*</span></label>
                                    <input type="text" value={String(form.nama_lengkap)} onChange={e => set("nama_lengkap", e.target.value)} required className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" placeholder="Nama lengkap pengguna" />
                                </div>
                                {!isEdit && (
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email <span className="text-red-500">*</span></label>
                                        <input type="email" value={String(form.email)} onChange={e => set("email", e.target.value)} required className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" placeholder="user@kotabogor.go.id" />
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">NIP <span className="text-gray-400 font-normal text-xs">(Opsional)</span></label>
                                    <input type="text" value={String(form.nip)} onChange={e => set("nip", e.target.value)} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" placeholder="19XXXXXXXXXX" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Jabatan <span className="text-gray-400 font-normal text-xs">(Opsional)</span></label>
                                    <input type="text" value={String(form.jabatan)} onChange={e => set("jabatan", e.target.value)} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" placeholder="Kepala Seksi, Staff, dll" />
                                </div>
                            </div>

                            {/* Right Column — Access & Role */}
                            <div className="lg:col-span-3 space-y-5">
                                <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                                    <KeyRound className="w-4 h-4 text-blue-500" />
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Akses & Peran</span>
                                </div>

                                {/* Role Radio Cards */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">Peran Pengguna <span className="text-red-500">*</span></label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {[
                                            { value: "admin_kecamatan", label: "Admin Kecamatan", desc: "Akses ke seluruh data kecamatan", icon: ShieldCheck, color: "blue" },
                                            { value: "admin_kelurahan", label: "Admin Kelurahan", desc: "Akses terbatas ke data kelurahan", icon: Shield, color: "emerald" },
                                        ].map(opt => {
                                            const selected = form.role === opt.value;
                                            return (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => set("role", opt.value)}
                                                    className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${selected
                                                        ? `border-${opt.color}-500 bg-${opt.color}-50/50 shadow-sm`
                                                        : "border-gray-200 bg-white hover:border-gray-300"
                                                        }`}
                                                >
                                                    <div className={`p-2 rounded-lg shrink-0 ${selected ? `bg-${opt.color}-100 text-${opt.color}-600` : "bg-gray-100 text-gray-400"}`}>
                                                        <opt.icon className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className={`text-sm font-bold ${selected ? "text-gray-900" : "text-gray-600"}`}>{opt.label}</p>
                                                        <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                                                    </div>
                                                    <div className={`ml-auto mt-1 w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${selected ? `border-${opt.color}-500` : "border-gray-300"}`}>
                                                        {selected && <div className={`w-2.5 h-2.5 rounded-full bg-${opt.color}-500`} />}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Kelurahan — conditional */}
                                {form.role === "admin_kelurahan" && (
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Kelurahan <span className="text-red-500">*</span></label>
                                        <select value={String(form.kelurahan_id)} onChange={e => set("kelurahan_id", e.target.value)} required className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all">
                                            <option value="">Pilih Kelurahan</option>
                                            {kelurahans.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                                        </select>
                                    </div>
                                )}

                                {/* Password & Confirmation */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 pb-2 border-b border-gray-200 mt-2">
                                        <KeyRound className="w-4 h-4 text-amber-500" />
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{isEdit ? "Ubah Sandi (Opsional)" : "Sandi Akun"}</span>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">{isEdit ? "Password Baru" : "Password"} {isEdit ? <span className="text-gray-400 font-normal text-xs">(Kosongkan jika tidak diubah)</span> : <span className="text-red-500">*</span>}</label>
                                        <input type="password" value={String(form.password)} onChange={e => set("password", e.target.value)} required={!isEdit} minLength={6} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" placeholder={isEdit ? "Ketik sandi baru" : "Minimal 6 karakter"} />

                                        {/* Password Strength Meter */}
                                        {String(form.password).length > 0 && (
                                            <div className="mt-2 space-y-1">
                                                <div className="flex gap-1 h-1.5">
                                                    {[1, 2, 3, 4, 5].map((level) => (
                                                        <div
                                                            key={level}
                                                            className={`flex-1 rounded-full transition-all duration-300 ${level <= passwordStrength.score ? passwordStrength.color : "bg-gray-200"}`}
                                                        />
                                                    ))}
                                                </div>
                                                <p className={`text-xs font-medium text-right ${passwordStrength.color.replace('bg-', 'text-')}`}>
                                                    {passwordStrength.text}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Show confirmation field if creating new, OR if editing and typed a new password */}
                                    {(!isEdit || (isEdit && String(form.password).length > 0)) && (
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Konfirmasi Password {isEdit ? "Baru" : ""} <span className="text-red-500">*</span></label>
                                            <input
                                                type="password"
                                                value={confirmPassword}
                                                onChange={e => setConfirmPassword(e.target.value)}
                                                required
                                                minLength={6}
                                                className={`w-full px-4 py-2.5 bg-white border rounded-xl text-sm focus:ring-2 transition-all ${confirmPassword.length > 0
                                                    ? confirmPassword !== String(form.password)
                                                        ? "border-red-300 focus:ring-red-500/20 focus:border-red-500"
                                                        : "border-emerald-300 focus:ring-emerald-500/20 focus:border-emerald-500"
                                                    : "border-gray-200 focus:ring-blue-500/20 focus:border-blue-500"
                                                    }`}
                                                placeholder="Ketik ulang password"
                                            />
                                            {confirmPassword.length > 0 && (
                                                confirmPassword !== String(form.password) ? (
                                                    <p className="text-xs text-red-500 mt-1">Sandi tidak cocok.</p>
                                                ) : (
                                                    <p className="text-xs text-emerald-500 mt-1">Sandi cocok.</p>
                                                )
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Status — only for edit */}
                                {isEdit && (
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status Akun</label>
                                        <select value={String(form.is_active)} onChange={e => set("is_active", e.target.value)} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all">
                                            <option value="true">Aktif</option>
                                            <option value="false">Nonaktif</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between px-6 py-4 md:px-8 border-t border-gray-100 bg-white shrink-0">
                        <p className="text-xs text-gray-400"><span className="text-red-400">*</span> Wajib diisi</p>
                        <div className="flex flex-col-reverse sm:flex-row items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
                            <button type="button" onClick={onClose} className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors">Batal</button>
                            <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-lg shadow-blue-600/30 disabled:opacity-50">
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {isEdit ? "Simpan Perubahan" : "Tambah Pengguna"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
