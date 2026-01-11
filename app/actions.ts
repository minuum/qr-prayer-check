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

// --- System Settings ---

export async function getSystemSettings() {
    if (!checkConfig() || !supabase) return {};

    const { data } = await supabase.from("system_settings").select("*");
    const settings: any = {};

    if (data) {
        data.forEach(row => {
            settings[row.key] = row.value;
        });
    }
    return settings;
}

export async function updateSystemSetting(key: string, value: string) {
    const isAdmin = await checkAdminSession();
    if (!isAdmin) return { success: false, error: "Unauthorized" };
    if (!checkConfig() || !supabase) return { success: false };

    const { error } = await supabase
        .from("system_settings")
        .upsert({ key, value });

    if (error) return { success: false, error: error.message };
    return { success: true };
}

// --- Check-In (User Side) ---

import { getDistance } from 'geolib';

export async function checkIn(name: string, phone: string, userLat?: number, userLng?: number) {
    if (!checkConfig() || !supabase) {
        return { success: false, error: "서버 DB 설정 오류" };
    }

    // 1. Fetch Settings (Session & Location)
    const settings = await getSystemSettings();

    // Check if session is active (default to true if not set, or false? Let's default true for ease unless set)
    // Actually, user wants "session changes". Let's enforce session active.
    if (settings['session_active'] === 'false') {
        return { success: false, error: "현재 출석체크 시간이 아닙니다." };
    }

    // 2. Validate Location (if configured)
    if (settings['church_lat'] && settings['church_lng'] && userLat && userLng) {
        const churchLat = parseFloat(settings['church_lat']);
        const churchLng = parseFloat(settings['church_lng']);

        const distance = getDistance(
            { latitude: userLat, longitude: userLng },
            { latitude: churchLat, longitude: churchLng }
        );

        // 200m radius as requested
        if (distance > 200) {
            return {
                success: false,
                error: `교회 반경 200m 이내에서만 출석이 가능합니다. (현재 거리: ${distance}m)`
            };
        }
    } else if ((settings['church_lat'] || settings['church_lng']) && (!userLat || !userLng)) {
        // Church location is set, but user didn't provide location
        return { success: false, error: "위치 정보를 허용해야 출석할 수 있습니다." };
    }

    // 3. Ensure User Exists
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
            return { success: false, error: "사용자 등록 실패" };
        }
        attendeeId = created.id;
    }

    // 4. Log Attendance (Duplication Check)
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
        // 12 hours cool-down to represent "one session per day" roughly
        if (now - lastTime < 12 * 60 * 60 * 1000) {
            return { success: true, message: "이미 오늘 출석하셨습니다.", alreadyChecked: true };
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


// --- User Actions ---

export async function getUserAttendance(name: string, phone: string, year: number, month: number) {
    if (!checkConfig() || !supabase) return [];

    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

    const { data } = await supabase
        .from("attendance_logs")
        .select("created_at")
        .eq("name", name)
        .eq("phone", phone)
        .gte("created_at", startDate)
        .lte("created_at", endDate);

    // Return array of date strings (YYYY-MM-DD)
    const attendedDates: string[] = [];
    if (data) {
        data.forEach((log) => {
            const kstDate = new Date(log.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
            if (!attendedDates.includes(kstDate)) {
                attendedDates.push(kstDate);
            }
        });
    }
    return attendedDates;
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

export async function getMonthlyStats(year: number, month: number) {
    const isAdmin = await checkAdminSession();
    if (!isAdmin) return {};
    if (!checkConfig() || !supabase) return {};

    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

    const { data } = await supabase
        .from("attendance_logs")
        .select("created_at")
        .gte("created_at", startDate)
        .lte("created_at", endDate);

    // Group by date (YYYY-MM-DD)
    const stats: { [key: string]: number } = {};
    if (data) {
        data.forEach((log) => {
            // Convert UTC to KST date string
            const kstDate = new Date(log.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
            stats[kstDate] = (stats[kstDate] || 0) + 1;
        });
    }
    return stats;
}

export async function getLogsByDate(dateStr: string) {
    const isAdmin = await checkAdminSession();
    if (!isAdmin) return [];
    if (!checkConfig() || !supabase) return [];

    // dateStr is YYYY-MM-DD (KST)
    // We need to cover the full UTC range for that KST day.
    // Simplest: query range with ample buffer or precise calculation.
    // KST is UTC+9. 
    // 2026-01-11 00:00 KST = 2026-01-10 15:00 UTC
    // 2026-01-11 23:59 KST = 2026-01-11 14:59 UTC

    // Instead of complex TZ math on server actions without libraries, 
    // let's fetch a slightly wider range and filter in code if needed, 
    // or trust Postgres Timezone if configured. Supabase saves as Timestamptz.

    // Let's use simple string matching on "YYYY-MM-DD" if we fetch ample data? 
    // No, pagination/performance matters.

    // Let's rely on client date string. 
    // "2026-01-11"
    const startObj = new Date(dateStr + "T00:00:00+09:00");
    const endObj = new Date(dateStr + "T23:59:59+09:00");

    const { data } = await supabase
        .from("attendance_logs")
        .select("*")
        .gte("created_at", startObj.toISOString())
        .lte("created_at", endObj.toISOString())
        .order("created_at", { ascending: true });

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
