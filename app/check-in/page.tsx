```javascript
"use client";

import { useState, useEffect } from "react";
import { User, Phone, CheckCircle, Loader2, MapPin, Calendar as CalendarIcon, ClipboardCheck, ChevronLeft, ChevronRight, Home, RefreshCcw } from "lucide-react";
import { checkIn, getUserAttendance } from "../actions";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import confetti from "canvas-confetti";
import Link from "next/link";
import clsx from "clsx";

export default function CheckInPage() {
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<"idle" | "success" | "already">("idle");
    const [msg, setMsg] = useState("");
    const [locating, setLocating] = useState(false);

    const [tab, setTab] = useState<"checkin" | "calendar">("checkin");
    const [attendedDates, setAttendedDates] = useState<string[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());

    // Load saved user
    useEffect(() => {
        const saved = localStorage.getItem("user_info");
        if (saved) {
            const parsed = JSON.parse(saved);
            setName(parsed.name);
            setPhone(parsed.phone);
        }
    }, []);

    // Load attendance when tab changes to calendar
    useEffect(() => {
        if (tab === "calendar" && name && phone) {
            loadAttendance(currentDate);
        }
    }, [tab, currentDate, name, phone]);

    const loadAttendance = async (date: Date) => {
        if (!name || !phone) return;
        const dates = await getUserAttendance(name, phone, date.getFullYear(), date.getMonth() + 1);
        setAttendedDates(dates);
    }

    const handleMonthChange = (dir: number) => {
        const newDate = dir > 0 ? addMonths(currentDate, 1) : subMonths(currentDate, 1);
        setCurrentDate(newDate);
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !phone) return;

        setLoading(true);
        setLocating(true);

        // Attempt to get location
        let lat: number | undefined;
        let lng: number | undefined;

        try {
            if ("geolocation" in navigator) {
                const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: true,
                        timeout: 5000, // 5s timeout
                        maximumAge: 0
                    });
                });
                lat = position.coords.latitude;
                lng = position.coords.longitude;
            }
        } catch (err) {
            console.error("Location error:", err);
        }

        setLocating(false);

        // Save for next time
        localStorage.setItem("user_info", JSON.stringify({ name, phone }));

        try {
            const res = await checkIn(name, phone, lat, lng);
            if (res.success) {
                setStatus("success");
                setMsg(res.message || "완료");
                if (!res.alreadyChecked) {
                    confetti({
                        particleCount: 150,
                        spread: 70,
                        origin: { y: 0.6 },
                        colors: ['#8b5cf6', '#ca8a04', '#ffffff']
                    });
                } else {
                    setStatus("already");
                }
            } else {
                alert(res.error);
                setLoading(false);
            }
        } catch {
            alert("서버 연결 실패. 잠시 후 다시 시도해주세요.");
            setLoading(false);
        }
    };

    const CalendarGrid = () => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);

        const days = eachDayOfInterval({ start: startDate, end: endDate });

        return (
            <div className="grid grid-cols-7 gap-1 w-full text-center">
                {['일', '월', '화', '수', '목', '금', '토'].map(d => (
                    <div key={d} className="text-xs text-slate-500 py-2">{d}</div>
                ))}
                {days.map((day, idx) => {
                    const dateStr = format(day, "yyyy-MM-dd");
                    const isAttended = attendedDates.includes(dateStr);
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isToday = isSameDay(day, new Date());

                    return (
                        <div
                            key={idx}
                            className={clsx(
                                "aspect-square rounded-xl flex flex-col items-center justify-center gap-1 relative transition-all",
                                !isCurrentMonth && "opacity-30",
                                isAttended ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-white/5 text-slate-400",
                                isToday && !isAttended && "border border-primary/50 text-primary"
                            )}
                        >
                            <span className={clsx("text-sm font-medium")}>
                                {format(day, "d")}
                            </span>
                            {isAttended && (
                                <CheckCircle className="w-3 h-3 text-white" />
                            )}
                        </div>
                    )
                })}
            </div>
        )
    };

    if (status === "success" || status === "already") {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-8 animate-in fade-in zoom-in duration-500 relative">

                <Link href="/" className="absolute top-6 left-6 text-slate-400 hover:text-white transition-colors">
                    <Home className="w-6 h-6" />
                </Link>

                <div className="relative mt-8">
                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                    <CheckCircle className="w-24 h-24 text-primary relative z-10" />
                </div>

                <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-white">
                        {status === "already" ? "이미 완료되었습니다" : "출석체크 완료!"}
                    </h1>
                    <p className="text-xl text-slate-300">
                        <span className="font-bold text-primary">{name}</span>님,<br />
                        오늘도 함께해주셔서 감사합니다.
                    </p>
                </div>

                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 w-full max-w-sm space-y-1">
                    <p className="text-sm text-slate-400">일시</p>
                    <p className="text-lg font-mono text-emerald-400">
                        {new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>

                <div className="flex flex-col w-full max-w-xs gap-3 pt-4">
                    <button
                        onClick={() => {
                            setStatus("idle");
                            setTab("calendar");
                            setLoading(false);
                        }}
                        className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                    >
                        <CalendarIcon className="w-4 h-4" /> 나의 출석부 확인
                    </button>

                    <Link
                        href="/"
                        className="w-full py-4 bg-transparent border border-white/20 text-slate-400 hover:text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-all"
                    >
                        <Home className="w-4 h-4" /> 홈으로 이동
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col items-center p-6 max-w-md mx-auto relative font-[family-name:var(--font-geist-sans)]">

            {/* Top Navigation */}
            <div className="w-full flex justify-between items-center mt-2 mb-6">
                <Link href="/" className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors">
                    <ChevronLeft className="w-6 h-6" />
                </Link>
            </div>

            <div className="w-full text-center space-y-2 mb-8">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    2026 주중기도회
                </h1>
                <p className="text-slate-400">함께 기도의 자리를 지켜주셔서 감사합니다</p>
            </div>

            {/* Tabs */}
            <div className="flex w-full bg-white/5 p-1 rounded-2xl mb-8">
                <button
                    onClick={() => setTab("checkin")}
                    className={clsx(
                        "flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2",
                        tab === 'checkin' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-white'
                    )}
                >
                    <ClipboardCheck className="w-4 h-4" /> 출석체크
                </button>
                <button
                    onClick={() => setTab("calendar")}
                    className={clsx(
                        "flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2",
                        tab === 'calendar' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-white'
                    )}
                >
                    <CalendarIcon className="w-4 h-4" /> 나의 출석부
                </button>
            </div>

            {tab === "checkin" ? (
                <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm text-slate-400 ml-1">이름</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="이름 입력"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all font-medium text-lg"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm text-slate-400 ml-1">전화번호 (뒷 4자리)</label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="1234"
                                        maxLength={4}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all font-medium text-lg tracking-widest"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-primary to-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
                        >
                            {loading ? (
                                <>
                                    {locating ? <MapPin className="animate-bounce w-5 h-5" /> : <Loader2 className="animate-spin w-5 h-5" />}
                                    {locating ? "위치 확인 중..." : "처리 중..."}
                                </>
                            ) : (
                                "출석체크 하기"
                            )}
                        </button>
                    </form>

                    <p className="text-center text-xs text-slate-600">
                        * 부정 출석 방지를 위해 위치 정보를 확인합니다.<br />
                        브라우저가 위치 권한을 요청하면 <span className="text-primary font-bold">'허용'</span>해 주세요.
                    </p>
                </div>
            ) : (
                <div className="w-full space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                    {(!name || !phone) ? (
                        <div className="text-center py-12 text-slate-500 bg-white/5 rounded-3xl border border-white/10">
                            <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>먼저 출석체크 탭에서<br />이름과 정보를 입력해주세요.</p>
                        </div>
                    ) : (
                        <div className="bg-white/5 rounded-3xl border border-white/10 p-6">
                            <div className="flex justify-between items-center mb-6">
                                <button onClick={() => handleMonthChange(-1)} className="p-2 hover:bg-white/10 rounded-lg"><ChevronLeft /></button>
                                <h2 className="text-xl font-bold">{format(currentDate, "yyyy년 M월")}</h2>
                                <button onClick={() => handleMonthChange(1)} className="p-2 hover:bg-white/10 rounded-lg"><ChevronRight /></button>
                            </div>

                            <div className="mb-6 flex items-center justify-center gap-2">
                                <span className="text-slate-400">이번 달 출석:</span>
                                <span className="text-2xl font-bold text-primary">{attendedDates.length}회</span>
                            </div>

                            <CalendarGrid />
                        </div>
                    )}
                </div>
            )}

        </div>
    );
}
```
