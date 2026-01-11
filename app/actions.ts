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

// --- Public Dashboard Actions ---

export async function getPublicStats() {
    if (!checkConfig() || !supabase) return { todayCount: 0, monthlyStats: {} };

    // Today's count
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
    const todayStart = todayStr + "T00:00:00";
    const todayEnd = todayStr + "T23:59:59";

    const { count } = await supabase
        .from("attendance_logs")
        .select("*", { count: 'exact', head: true })
        .gte("created_at", todayStart)
        .lte("created_at", todayEnd);

    // Monthly stats for calendar heatmap
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const monthlyStats = await getMonthlyStats(year, month);

    return {
        todayCount: count || 0,
        monthlyStats: monthlyStats
    };
}

export async function getDailyVerse() {
    const today = new Date().getDate();
    // Simple rotation of 31 verses
    const verses = [
        { text: "너는 기도할 때에 네 골방에 들어가 문을 닫고 은밀한 중에 계신 네 아버지께 기도하라", addr: "마태복음 6:6" },
        { text: "아무 것도 염려하지 말고 다만 모든 일에 기도와 간구로, 너희 구할 것을 감사함으로 하나님께 아뢰라", addr: "빌립보서 4:6" },
        { text: "구하라 그리하면 너희에게 주실 것이요 찾으라 그리하면 찾아낼 것이요 문을 두드리라 그리하면 너희에게 열릴 것이니", addr: "마태복음 7:7" },
        { text: "쉬지 말고 기도하라 범사에 감사하라 이것이 그리스도 예수 안에서 너희를 향하신 하나님의 뜻이니라", addr: "데살로니가전서 5:17-18" },
        { text: "너희가 내 안에 거하고 내 말이 너희 안에 거하면 무엇이든지 원하는 대로 구하라 그리하면 이루리라", addr: "요한복음 15:7" },
        { text: "일을 행하시는 여호와, 그것을 만들며 성취하시는 여호와... 너는 내게 부르짖으라 내가 네게 응답하겠고", addr: "예레미야 33:2-3" },
        { text: "의인의 간구는 역사하는 힘이 큼이니라", addr: "야고보서 5:16" },
        { text: "새벽 아직도 밝기 전에 예수께서 일어나 나가 한적한 곳으로 가사 거기서 기도하시더니", addr: "마가복음 1:35" },
        { text: "기도를 계속하고 기도에 감사함으로 깨어 있으라", addr: "골로새서 4:2" },
        { text: "여호와께 바라는 너희들아 강하고 담대하라", addr: "시편 31:24" },
        // ... more verses can be added. Repeating list if day > length
    ];

    const index = (today - 1) % verses.length;
    return verses[index];
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

export async function getAllLogs(page = 1, limit = 20, search = "", sortBy = "created_at", sortOrder = "desc") {
    const isAdmin = await checkAdminSession();
    if (!isAdmin) return { data: [], count: 0 };
    if (!checkConfig() || !supabase) return { data: [], count: 0 };

    const offset = (page - 1) * limit;

    let query = supabase
        .from("attendance_logs")
        .select("*", { count: 'exact' })
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(offset, offset + limit - 1);

    if (search) {
        query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data, count } = await query;
    return { data: data || [], count: count || 0 };
}

export async function getAttendees(page = 1, limit = 20, search = "", sortBy = "created_at", sortOrder = "desc") {
    const isAdmin = await checkAdminSession();
    if (!isAdmin) return { data: [], count: 0 };
    if (!checkConfig() || !supabase) return { data: [], count: 0 };

    const offset = (page - 1) * limit;

    // Use Foreign Table aggregation if possible, or just raw select
    // Assuming 'attendance_logs' has foreign key to 'attendees'
    let query = supabase
        .from("attendees")
        .select("*, attendance_logs(count)", { count: 'exact' })
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(offset, offset + limit - 1);

    if (search) {
        query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data, count } = await query;

    // Map to cleaner structure
    const mapped = data?.map((d: any) => ({
        ...d,
        checkInCount: d.attendance_logs?.[0]?.count || 0
    })) || [];

    return { data: mapped, count: count || 0 };
}


export async function deleteLog(id: number) {
    const isAdmin = await checkAdminSession();
    if (!isAdmin) return { success: false, error: "Unauthorized" };
    if (!checkConfig() || !supabase) return { success: false, error: "Config error" };

    const { error } = await supabase
        .from("attendance_logs")
        .delete()
        .eq("id", id);


    if (error) return { success: false, error: error.message };
    return { success: true };
}

export async function deleteAttendee(id: string) {
    const isAdmin = await checkAdminSession();
    if (!isAdmin) return { success: false, error: "Unauthorized" };
    if (!checkConfig() || !supabase) return { success: false, error: "Config error" };

    // Delete logs first usually, unless CASCADE is set.
    // Let's safe delete logs first.
    const { error: logError } = await supabase
        .from("attendance_logs")
        .delete()
        .eq("attendee_id", id);

    if (logError) return { success: false, error: "로그 삭제 실패: " + logError.message };

    const { error } = await supabase
        .from("attendees")
        .delete()
        .eq("id", id);

    if (error) return { success: false, error: error.message };
    return { success: true };
}

export async function getAttendanceRankings(limit = 20, period: 'all' | 'month' = 'all', sortBy: 'count' | 'streak' = 'count') {
    const isAdmin = await checkAdminSession();
    if (!isAdmin) return [];
    if (!checkConfig() || !supabase) return [];

    let query = supabase.from("attendance_logs").select("name, phone, created_at");

    // Filter by Period
    const now = new Date();
    if (period === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        query = query.gte('created_at', startOfMonth);
    }

    const { data } = await query;
    if (!data) return [];

    // Aggregation & Streak Calculation
    const stats: {
        [key: string]: {
            name: string,
            phone: string,
            count: number,
            streak: number,
            last_seen: string,
            dates: Set<string>
        }
    } = {};

    data.forEach(row => {
        const key = `${row.name}-${row.phone}`;
        const dateObj = new Date(row.created_at);
        // UTC+9 approx
        const kstDate = new Date(dateObj.getTime() + (9 * 60 * 60 * 1000));
        const dateStr = kstDate.toISOString().split('T')[0];

        if (!stats[key]) {
            stats[key] = {
                name: row.name,
                phone: row.phone,
                count: 0,
                streak: 0,
                last_seen: row.created_at,
                dates: new Set()
            };
        }

        stats[key].count++;
        stats[key].dates.add(dateStr);

        if (new Date(row.created_at) > new Date(stats[key].last_seen)) {
            stats[key].last_seen = row.created_at;
        }
    });

    // Streak Calculation
    const today = new Date();
    // UTC+9 approx today
    const d = new Date(today.getTime() + (9 * 60 * 60 * 1000));

    Object.values(stats).forEach(user => {
        let streak = 0;
        let loopDate = new Date(d); // Copy

        const dStr = loopDate.toISOString().split('T')[0];
        const yStr = new Date(loopDate.getTime() - 86400000).toISOString().split('T')[0];

        if (user.dates.has(dStr)) {
            // Started today
        } else if (user.dates.has(yStr)) {
            // Started yesterday
            loopDate.setDate(loopDate.getDate() - 1);
        } else {
            user.streak = 0;
            return;
        }

        while (true) {
            const str = loopDate.toISOString().split('T')[0];
            if (user.dates.has(str)) {
                streak++;
                loopDate.setDate(loopDate.getDate() - 1);
            } else {
                break;
            }
        }
        user.streak = streak;
    });

    const result = Object.values(stats);

    if (sortBy === 'streak') {
        result.sort((a, b) => b.streak - a.streak || b.count - a.count);
    } else {
        result.sort((a, b) => b.count - a.count || b.streak - a.streak);
    }

    return result.slice(0, limit);
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
