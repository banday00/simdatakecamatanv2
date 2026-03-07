import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// POST — Create a new user (Supabase Auth + user_profiles insert)
export async function POST(req: NextRequest) {
    try {
        // Verify the caller is authenticated and has the right role
        const serverSupa = await createServerSupabaseClient();
        const { data: { user: caller } } = await serverSupa.auth.getUser();
        if (!caller) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check caller role from user_profiles
        const { data: callerProfile } = await serverSupa
            .schema("sidakota")
            .from("user_profiles")
            .select("role")
            .eq("id", caller.id)
            .single();

        if (!callerProfile || !["super_admin", "admin_kecamatan"].includes(callerProfile.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { email, password, nama_lengkap, nip, jabatan, role, kelurahan_id, tenant_id } = body;

        if (!email || !password || !nama_lengkap || !role || !tenant_id) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Use admin client to create auth user
        const adminSupa = createAdminClient();
        const { data: authData, error: authError } = await adminSupa.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                password_changed_at: null,
            }
        });

        if (authError) {
            return NextResponse.json({ error: authError.message }, { status: 400 });
        }

        // Insert user_profiles row
        const { error: profileError } = await adminSupa
            .schema("sidakota")
            .from("user_profiles")
            .insert({
                id: authData.user.id,
                tenant_id,
                nama_lengkap,
                nip: nip || null,
                jabatan: jabatan || null,
                role,
                kelurahan_id: role === "admin_kelurahan" ? kelurahan_id : null,
                is_active: true,
            });

        if (profileError) {
            // Rollback: delete the auth user if profile insert fails
            await adminSupa.auth.admin.deleteUser(authData.user.id);
            return NextResponse.json({ error: profileError.message }, { status: 400 });
        }

        return NextResponse.json({ success: true, userId: authData.user.id });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
    }
}

// DELETE — Delete a user (Supabase Auth + user_profiles)
export async function DELETE(req: NextRequest) {
    try {
        const serverSupa = await createServerSupabaseClient();
        const { data: { user: caller } } = await serverSupa.auth.getUser();
        if (!caller) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: callerProfile } = await serverSupa
            .schema("sidakota")
            .from("user_profiles")
            .select("role")
            .eq("id", caller.id)
            .single();

        if (!callerProfile || !["super_admin", "admin_kecamatan"].includes(callerProfile.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("userId");
        if (!userId) {
            return NextResponse.json({ error: "userId required" }, { status: 400 });
        }

        // Prevent self-deletion
        if (userId === caller.id) {
            return NextResponse.json({ error: "Tidak bisa menghapus akun sendiri" }, { status: 400 });
        }

        const adminSupa = createAdminClient();

        // Delete profile first
        await adminSupa
            .schema("sidakota")
            .from("user_profiles")
            .delete()
            .eq("id", userId);

        // Then delete auth user
        const { error: authError } = await adminSupa.auth.admin.deleteUser(userId);
        if (authError) {
            return NextResponse.json({ error: authError.message }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
    }
}

// PATCH — Update an existing user's password
export async function PATCH(req: NextRequest) {
    try {
        const serverSupa = await createServerSupabaseClient();
        const { data: { user: caller } } = await serverSupa.auth.getUser();
        if (!caller) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: callerProfile } = await serverSupa
            .schema("sidakota")
            .from("user_profiles")
            .select("role")
            .eq("id", caller.id)
            .single();

        if (!callerProfile || !["super_admin", "admin_kecamatan"].includes(callerProfile.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { userId, password } = body;

        if (!userId || !password) {
            return NextResponse.json({ error: "userId and password are required" }, { status: 400 });
        }

        const adminSupa = createAdminClient();

        const { error: authError } = await adminSupa.auth.admin.updateUserById(
            userId,
            { password }
        );

        if (authError) {
            return NextResponse.json({ error: authError.message }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
    }
}
