"use client";

import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RefreshCw, Trash2, Lock, Printer, List, Link as LinkIcon, Download, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Settings, MapPin, Power, Database, Trophy, Search, Loader2 } from "lucide-react";
import Link from "next/link";
import { checkAdminSession, loginAdmin, logoutAdmin, getTodaysLogs, clearHistory, getMonthlyStats, getLogsByDate, getSystemSettings, updateSystemSetting, getAllLogs, getAttendanceRankings, deleteLog } from "../actions";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import clsx from "clsx";

interface ScanRecord {
    id: number;
    name: string;
    phone: string;
    created_at: string;
}

export default function AdminPage() {
    const [isAdmin, setIsAdmin] = useState(false);
    const [password, setPassword] = useState("");
    const [logs, setLogs] = useState<ScanRecord[]>([]);
    const [tab, setTab] = useState<"dashboard" | "calendar" | "db" | "ranking" | "qr" | "settings">("dashboard");
    const [hostUrl, setHostUrl] = useState("");

    // Calendar State
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
    const [monthlyStats, setMonthlyStats] = useState<{ [key: string]: number }>({});
    const [selectedLogs, setSelectedLogs] = useState<ScanRecord[]>([]);

    // Settings State
    const [settings, setSettings] = useState<any>({});
    const [updatingSettings, setUpdatingSettings] = useState(false);

    // DB State
    const [dbLogs, setDbLogs] = useState<ScanRecord[]>([]);
    const [dbCount, setDbCount] = useState(0);
    const [dbPage, setDbPage] = useState(1);
    const [dbSearch, setDbSearch] = useState("");
    const [dbLoading, setDbLoading] = useState(false);

    // Ranking State
    const [rankings, setRankings] = useState<any[]>([]);

    useEffect(() => {
        checkAdminSession().then((valid) => {
            setIsAdmin(valid);
            if (valid) {
                loadLogs();
                loadMonthlyStats(currentDate);
                if (selectedDate) loadSelectedDateLogs(selectedDate);
                loadSettings();
            }
        });

        // Auto-detect URL
        if (typeof window !== "undefined") {
            setHostUrl(window.location.origin);
        }
    }, []);

    useEffect(() => {
        if (isAdmin && tab === "db") loadDbLogs();
        if (isAdmin && tab === "ranking") loadRankings();
    }, [isAdmin, tab, dbPage, dbSearch]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await loginAdmin(password);
        if (res.success) {
            setIsAdmin(true);
            loadLogs();
            loadMonthlyStats(currentDate);
            if (selectedDate) loadSelectedDateLogs(selectedDate);
            loadSettings();
        } else {
            alert(res.error);
        }
    }

    const loadLogs = async () => {
        const data = await getTodaysLogs();
        const mapped = data.map((d: any) => ({
            id: d.id,
            name: d.name,
            phone: d.phone,
            created_at: new Date(d.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
        }));
        setLogs(mapped);
    }

    const loadDbLogs = async () => {
        setDbLoading(true);
        const res = await getAllLogs(dbPage, 20, dbSearch);
        const mapped = res.data.map((d: any) => ({
            id: d.id,
            name: d.name,
            phone: d.phone,
            created_at: new Date(d.created_at).toLocaleString('ko-KR')
        }));
        setDbLogs(mapped);
        setDbCount(res.count);
        setDbLoading(false);
    }

    const handleDeleteLog = async (id: number) => {
        if (!confirm("이 기록을 삭제하시겠습니까? (복구 불가)")) return;
        await deleteLog(id);
        loadDbLogs(); // Refresh
        loadLogs(); // Refresh dashboard too
    }

    const loadRankings = async () => {
        const data = await getAttendanceRankings(20); // Top 20
        setRankings(data);
    }

    const loadMonthlyStats = async (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const stats = await getMonthlyStats(year, month);
        setMonthlyStats(stats);
    }

    const loadSelectedDateLogs = async (date: Date) => {
        const dateStr = format(date, "yyyy-MM-dd");
        const data = await getLogsByDate(dateStr);
        const mapped = data.map((d: any) => ({
            id: d.id,
            name: d.name,
            phone: d.phone,
            created_at: new Date(d.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
        }));
        setSelectedLogs(mapped);
    }

    const loadSettings = async () => {
        const data = await getSystemSettings();
        setSettings(data);
    }

    const handleMonthChange = (dir: number) => {
        const newDate = dir > 0 ? addMonths(currentDate, 1) : subMonths(currentDate, 1);
        setCurrentDate(newDate);
        loadMonthlyStats(newDate);
    }

    const handleDateClick = (day: Date) => {
        setSelectedDate(day);
        loadSelectedDateLogs(day);
    }

    const handleClear = async () => {
        if (confirm("모든 기록을 삭제하시겠습니까? (복구 불가)")) {
            await clearHistory();
            loadLogs();
            loadMonthlyStats(currentDate);
            if (selectedDate) loadSelectedDateLogs(selectedDate);
        }
    }

    const toggleSession = async () => {
        const newVal = settings['session_active'] === 'false' ? 'true' : 'false';
        setUpdatingSettings(true);
        await updateSystemSetting('session_active', newVal);
        await loadSettings();
        setUpdatingSettings(false);
    }

    const setLocation = async () => {
        if (!confirm("현재 위치를 교회 위치로 설정하시겠습니까?\n이후 이 위치에서 반경 200m 이내만 출석이 허용됩니다.")) return;

        setUpdatingSettings(true);
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(async (pos) => {
                await updateSystemSetting('church_lat', pos.coords.latitude.toString());
                await updateSystemSetting('church_lng', pos.coords.longitude.toString());
                await loadSettings();
                alert("위치가 설정되었습니다.");
                setUpdatingSettings(false);
            }, (err) => {
                alert("위치 정보를 가져올 수 없습니다: " + err.message);
                setUpdatingSettings(false);
            }, { enableHighAccuracy: true });
        } else {
            alert("브라우저가 위치 기능을 지원하지 않습니다.");
            setUpdatingSettings(false);
        }
    }

    const clearLocation = async () => {
        if (!confirm("위치 제한을 해제하시겠습니까? (어디서나 출석 가능)")) return;
        setUpdatingSettings(true);
        await updateSystemSetting('church_lat', '');
        await updateSystemSetting('church_lng', '');
        await loadSettings();
        setUpdatingSettings(false);
    }

    // Generate Calendar Grid
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
                    const count = monthlyStats[dateStr] || 0;
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const isCurrentMonth = isSameMonth(day, currentDate);

                    return (
                        <button
                            key={idx}
                            onClick={() => handleDateClick(day)}
                            className={clsx(
                                "aspect-square rounded-xl flex flex-col items-center justify-center gap-1 relative transition-all",
                                !isCurrentMonth && "opacity-30",
                                isSelected ? "bg-primary text-white" : "hover:bg-white/10 text-slate-300",
                            )}
                        >
                            <span className={clsx("text-sm font-medium", isSelected ? "text-white" : "text-slate-300")}>
                                {format(day, "d")}
                            </span>
                            {count > 0 && (
                                <span className={clsx(
                                    "text-[10px] font-bold px-1.5 rounded-full",
                                    isSelected ? "bg-white text-primary" : "bg-primary/20 text-primary"
                                )}>
                                    {count}
                                </span>
                            )}
                        </button>
                    )
                })}
            </div>
        )
    };

    // --- Render ---

    if (!isAdmin) {
        return (
            <div className="min-h-screen grid items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-sm bg-white/5 border border-white/10 p-8 rounded-3xl space-y-6"
                >
                    <div className="text-center">
                        <Lock className="w-12 h-12 text-primary mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-white">관리자 로그인</h1>
                        <p className="text-slate-400 text-sm">비밀번호를 입력하세요</p>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-primary outline-none"
                            placeholder="Password"
                        />
                        <button className="w-full bg-primary text-white font-bold py-3 rounded-xl">
                            로그인
                        </button>
                    </form>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="min-h-screen p-4 flex flex-col items-center max-w-2xl mx-auto font-[family-name:var(--font-geist-sans)]">
            <div className="w-full flex justify-between items-center mb-6 pt-2">
                <Link href="/" className="text-slate-400 hover:text-white">
                    <ArrowLeft />
                </Link>
                <h1 className="text-xl font-bold">관리자 도구</h1>
                <button onClick={() => logoutAdmin().then(() => setIsAdmin(false))} className="text-xs text-red-400 border border-red-900 px-2 py-1 rounded">
                    로그아웃
                </button>
            </div>

            {/* Tabs */}
            <div className="flex w-full bg-white/5 p-1 rounded-xl mb-6 overflow-x-auto no-scrollbar">
                <button
                    onClick={() => setTab("dashboard")}
                    className={`flex-1 py-2 px-3 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${tab === 'dashboard' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                    <List className="w-4 h-4 inline mr-2" /> 현황판
                </button>
                <button
                    onClick={() => setTab("calendar")}
                    className={`flex-1 py-2 px-3 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${tab === 'calendar' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                    <CalendarIcon className="w-4 h-4 inline mr-2" /> 캘린더
                </button>
                <button
                    onClick={() => setTab("db")}
                    className={`flex-1 py-2 px-3 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${tab === 'db' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                    <Database className="w-4 h-4 inline mr-2" /> DB
                </button>
                <button
                    onClick={() => setTab("ranking")}
                    className={`flex-1 py-2 px-3 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${tab === 'ranking' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                    <Trophy className="w-4 h-4 inline mr-2" /> 순위
                </button>
                <button
                    onClick={() => setTab("qr")}
                    className={`flex-1 py-2 px-3 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${tab === 'qr' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                    <Printer className="w-4 h-4 inline mr-2" /> QR
                </button>
                <button
                    onClick={() => setTab("settings")}
                    className={`flex-1 py-2 px-3 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${tab === 'settings' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                    <Settings className="w-4 h-4 inline mr-2" /> 설정
                </button>
            </div>

            {/* --- Tab Content --- */}

            {tab === "dashboard" && (
                <div className="w-full space-y-4 animate-in fade-in duration-300">
                    <div className="flex justify-between items-center bg-white/5 p-6 rounded-3xl border border-white/10">
                        <div>
                            <p className="text-slate-400 text-sm">금일 출석 인원</p>
                            <p className="text-4xl font-black text-white">{logs.length}<span className="text-lg text-primary ml-1">명</span></p>
                        </div>
                        <button onClick={loadLogs} className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                            <RefreshCw className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 min-h-[400px]">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold">최근 출석 목록</h2>
                            <button onClick={handleClear} className="text-slate-500 hover:text-red-400">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                            {logs.length === 0 ? (
                                <p className="text-center text-slate-500 py-12">아직 출석 기록이 없습니다.</p>
                            ) : (
                                logs.map((log) => (
                                    <motion.div
                                        key={log.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="bg-white/5 p-4 rounded-xl flex justify-between items-center"
                                    >
                                        <div>
                                            <p className="font-bold text-white text-lg">{log.name}</p>
                                            <p className="text-sm text-slate-400">{log.phone}</p>
                                        </div>
                                        <span className="text-sm font-mono text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                                            {log.created_at}
                                        </span>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {tab === "calendar" && (
                <div className="w-full space-y-6 animate-in fade-in duration-300">
                    <div className="bg-white/5 rounded-3xl border border-white/10 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <button onClick={() => handleMonthChange(-1)} className="p-2 hover:bg-white/10 rounded-lg"><ChevronLeft /></button>
                            <h2 className="text-xl font-bold">{format(currentDate, "yyyy년 M월")}</h2>
                            <button onClick={() => handleMonthChange(1)} className="p-2 hover:bg-white/10 rounded-lg"><ChevronRight /></button>
                        </div>
                        <CalendarGrid />
                    </div>

                    {selectedDate && (
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 min-h-[300px]">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <span className="text-primary">{format(selectedDate, "M월 d일")}</span> 출석 명단
                                <span className="bg-white/10 text-xs px-2 py-1 rounded-full text-slate-400">{selectedLogs.length}명</span>
                            </h3>

                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {selectedLogs.length === 0 ? (
                                    <p className="text-center text-slate-500 py-8">이 날짜의 기록이 없습니다.</p>
                                ) : (
                                    selectedLogs.map((log) => (
                                        <motion.div
                                            key={log.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="bg-white/5 p-4 rounded-xl flex justify-between items-center"
                                        >
                                            <div>
                                                <p className="font-bold text-white text-lg">{log.name}</p>
                                                <p className="text-sm text-slate-400">{log.phone}</p>
                                            </div>
                                            <span className="text-sm font-mono text-slate-500">
                                                {log.created_at}
                                            </span>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {tab === "db" && (
                <div className="w-full space-y-4 animate-in fade-in duration-300">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex gap-2">
                        <Search className="w-5 h-5 text-slate-400 mt-2.5" />
                        <input
                            type="text"
                            value={dbSearch}
                            onChange={(e) => { setDbSearch(e.target.value); setDbPage(1); }}
                            placeholder="이름이나 전화번호로 검색..."
                            className="w-full bg-transparent border-none text-white focus:ring-0 placeholder:text-slate-600 outline-none p-2"
                        />
                    </div>

                    <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden min-h-[400px]">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-white/5 text-slate-400 font-medium">
                                    <tr>
                                        <th className="p-4">날짜</th>
                                        <th className="p-4">이름</th>
                                        <th className="p-4">전화번호</th>
                                        <th className="p-4 text-right">관리</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {dbLoading ? (
                                        <tr><td colSpan={4} className="p-8 text-center text-slate-500"><Loader2 className="w-6 h-6 mx-auto animate-spin" /></td></tr>
                                    ) : dbLogs.length === 0 ? (
                                        <tr><td colSpan={4} className="p-8 text-center text-slate-500">데이터가 없습니다.</td></tr>
                                    ) : (
                                        dbLogs.map(log => (
                                            <tr key={log.id} className="hover:bg-white/5 transition-colors">
                                                <td className="p-4 text-slate-300">{log.created_at}</td>
                                                <td className="p-4 font-bold text-white">{log.name}</td>
                                                <td className="p-4 text-slate-400">{log.phone}</td>
                                                <td className="p-4 text-right">
                                                    <button onClick={() => handleDeleteLog(log.id)} className="text-slate-500 hover:text-red-400 p-2">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex justify-between items-center text-sm text-slate-400 px-2">
                        <button
                            disabled={dbPage === 1}
                            onClick={() => setDbPage(p => Math.max(1, p - 1))}
                            className="p-2 hover:text-white disabled:opacity-30"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span>{dbPage} / {Math.ceil(dbCount / 20) || 1} 페이지 (총 {dbCount}건)</span>
                        <button
                            disabled={dbPage >= Math.ceil(dbCount / 20)}
                            onClick={() => setDbPage(p => p + 1)}
                            className="p-2 hover:text-white disabled:opacity-30"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            {tab === "ranking" && (
                <div className="w-full space-y-6 animate-in fade-in duration-300">
                    <div className="bg-gradient-to-br from-yellow-500/20 to-amber-700/10 border border-yellow-500/20 p-6 rounded-3xl flex items-center gap-4">
                        <div className="p-4 bg-yellow-500/20 rounded-full text-yellow-500">
                            <Trophy className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">출석 명예의 전당</h2>
                            <p className="text-slate-400 text-sm">가장 많이 참석하신 분들을 소개합니다</p>
                        </div>
                    </div>

                    <div className="grid gap-3">
                        {rankings.map((user, idx) => (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.05 }}
                                key={`${user.name}-${user.phone}`}
                                className={clsx(
                                    "flex items-center justify-between p-4 rounded-2xl border",
                                    idx === 0 ? "bg-gradient-to-r from-yellow-500/10 to-transparent border-yellow-500/30" :
                                        idx === 1 ? "bg-gradient-to-r from-slate-400/10 to-transparent border-slate-400/30" :
                                            idx === 2 ? "bg-gradient-to-r from-amber-700/10 to-transparent border-amber-700/30" :
                                                "bg-white/5 border-white/5"
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={clsx(
                                        "w-8 h-8 flex items-center justify-center font-black rounded-lg",
                                        idx === 0 ? "text-yellow-400 bg-yellow-400/10" :
                                            idx === 1 ? "text-slate-300 bg-slate-400/10" :
                                                idx === 2 ? "text-amber-600 bg-amber-700/10" :
                                                    "text-slate-500 bg-white/5"
                                    )}>
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <p className="font-bold text-white text-lg">{user.name}</p>
                                        <p className="text-xs text-slate-500">{user.phone}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-2xl font-black text-white">{user.count}</span>
                                    <span className="text-xs text-slate-500 ml-1">회</span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {tab === "qr" && (
                <div className="w-full space-y-6 animate-in fade-in duration-300">
                    <div className="bg-white p-8 rounded-3xl border border-white/10 text-center space-y-6 shadow-2xl">
                        <h2 className="text-2xl font-bold text-black mb-2">2026 주중기도회 출석체크</h2>
                        <div className="flex justify-center p-4 bg-white">
                            <QRCodeCanvas
                                value={`${hostUrl}/check-in`}
                                size={300}
                                level="H"
                                bgColor="#FFFFFF"
                                fgColor="#000000"
                                imageSettings={{
                                    src: "",
                                    height: 24,
                                    width: 24,
                                    excavate: true,
                                }}
                            />
                        </div>
                        <p className="text-black/60 font-medium">
                            위 QR코드를 스캔하여 출석을 체크해주세요
                        </p>
                        <div className="text-xs text-slate-400 border-t pt-4">
                            LINK: {hostUrl}/check-in
                        </div>
                    </div>

                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10 space-y-4">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <LinkIcon className="w-4 h-4" /> 도메인 설정
                        </h3>
                        <p className="text-sm text-slate-400">
                            QR코드가 가리키는 주소가 올바른지 확인하세요.<br />
                            배포된 사이트 주소와 일치해야 합니다.
                        </p>
                        <input
                            type="text"
                            value={hostUrl}
                            onChange={(e) => setHostUrl(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white font-mono text-sm"
                        />
                    </div>

                    <p className="text-center text-slate-500 text-sm">
                        Tip: 이 화면을 캡쳐하거나 인쇄하여 사용하세요.
                    </p>
                </div>
            )}

            {tab === "settings" && (
                <div className="w-full space-y-6 animate-in fade-in duration-300">
                    {/* Check-in Toggle */}
                    <div className="bg-white/5 rounded-3xl border border-white/10 p-6 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Power className="w-5 h-5 text-accent" /> 출석 시스템 상태
                            </h3>
                            <p className="text-sm text-slate-400 mt-1">
                                {settings['session_active'] === 'false' ? '현재 출석이 비활성화됨' : '현재 출석 가능 상태'}
                            </p>
                        </div>
                        <button
                            disabled={updatingSettings}
                            onClick={toggleSession}
                            className={clsx(
                                "px-6 py-3 rounded-xl font-bold transition-all",
                                settings['session_active'] === 'false' ? "bg-red-500/20 text-red-400 border border-red-500/50" : "bg-green-500/20 text-green-400 border border-green-500/50"
                            )}
                        >
                            {settings['session_active'] === 'false' ? '꺼짐 (Closed)' : '켜짐 (Active)'}
                        </button>
                    </div>

                    {/* Location Setting */}
                    <div className="bg-white/5 rounded-3xl border border-white/10 p-6 space-y-6">
                        <div className="flex items-center gap-2 mb-2">
                            <MapPin className="w-6 h-6 text-primary" />
                            <h3 className="text-lg font-bold text-white">교회 위치 설정</h3>
                        </div>

                        <p className="text-sm text-slate-400">
                            부정 입력을 방지하기 위해 현재 위치를 교회 위치로 등록합니다.<br />
                            등록되면 반경 200m 이내에서만 출석이 가능합니다.
                        </p>

                        <div className="p-4 bg-black/30 rounded-xl font-mono text-sm space-y-2">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Latitude</span>
                                <span className="text-white">{settings['church_lat'] || '설정안됨'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Longitude</span>
                                <span className="text-white">{settings['church_lng'] || '설정안됨'}</span>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={setLocation}
                                disabled={updatingSettings}
                                className="flex-1 bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary/90 transition-all"
                            >
                                현재 위치로 설정
                            </button>
                            {settings['church_lat'] && (
                                <button
                                    onClick={clearLocation}
                                    disabled={updatingSettings}
                                    className="bg-white/10 text-slate-300 font-bold px-4 rounded-xl hover:bg-white/20 transition-all"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
