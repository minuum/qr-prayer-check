"use server";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = (supabaseUrl && supabaseKey)
    ? createClient(supabaseUrl, supabaseKey)
    : null;

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "2026prayer";

function checkConfig() {
    if (!supabase) {
        console.error("Supabase environment variables are missing.");
        return false;
    }
    return true;
}

// --- Auth ---

export async function checkAdminSession() {
    const cookieStore = await cookies();
    const auth = cookieStore.get("admin_auth");
    return auth?.value === "true";
}

export async function loginAdmin(password: string) {
    if (password === ADMIN_PASSWORD) {
        const cookieStore = await cookies();
        cookieStore.set("admin_auth", "true", { httpOnly: true, secure: true });
        return { success: true };
    }
    return { success: false, error: "비밀번호가 올바르지 않습니다." };
}

export async function logoutAdmin() {
    const cookieStore = await cookies();
    cookieStore.delete("admin_auth");
    return { success: true };
}

// --- Check-In (User Side) ---

export async function checkIn(name: string, phone: string) {
    if (!checkConfig() || !supabase) {
        return { success: false, error: "서버 DB 설정이 되지 않았습니다. 관리자에게 문의하세요." };
    }

    // 1. Ensure User Exists (Upsert)
    // We try to find existing user first to get stable UUID if needed, or just insert.
    // Upsert relies on unique constraint (name, phone).

    // First, try to select
    let attendeeId: string | null = null;

    const { data: existing } = await supabase
        .from("attendees")
        .select("id")
        .eq("name", name)
        .eq("phone", phone)
        .single();

    if (existing) {
        attendeeId = existing.id;
    } else {
        const { data: created, error } = await supabase
            .from("attendees")
            .insert([{ name, phone }])
            .select("id")
            .single();

        if (error || !created) {
            console.error("Create error:", error);
            return { success: false, error: "사용자 등록 실패" };
        }
        attendeeId = created.id;
    }

    // 2. Log Attendance
    // Prevent duplicate check-in within short time (e.g. 1 hour) ? 
    // For simplicity, we just log. The admin view can filter duplicates or we can check recent log.

    // Check recent log (last 1 hour)
    const { data: recent } = await supabase
        .from("attendance_logs")
        .select("created_at")
        .eq("attendee_id", attendeeId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

    if (recent) {
        const lastTime = new Date(recent.created_at).getTime();
        const now = Date.now();
        if (now - lastTime < 60 * 60 * 1000) { // 1 hour
            return { success: true, message: "이미 출석체크 되었습니다.", alreadyChecked: true };
        }
    }

    const { error: logError } = await supabase
        .from("attendance_logs")
        .insert([{ attendee_id: attendeeId, name, phone }]);

    if (logError) {
        return { success: false, error: "출석 기록 실패" };
    }

    revalidatePath("/admin");
    return { success: true, message: "출석이 완료되었습니다!" };
}


// --- Admin Actions ---

export async function getTodaysLogs() {
    const isAdmin = await checkAdminSession();
    if (!isAdmin) return [];
    if (!checkConfig() || !supabase) return [];

    // Get logs from today (KST approx) or just last 24h
    // Simple approach: standard updated_at order descending

    const { data } = await supabase
        .from("attendance_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

    return data || [];
}

export async function clearHistory() {
    const isAdmin = await checkAdminSession();
    if (!isAdmin) return { success: false };
    if (!checkConfig() || !supabase) return { success: false, error: "DB 설정 오류" };

    const { error } = await supabase.from("attendance_logs").delete().neq("id", 0);

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin");
    return { success: true };
}
