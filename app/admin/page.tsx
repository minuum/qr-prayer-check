"use client";

import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RefreshCw, Trash2, Lock, Printer, List, Link as LinkIcon, Download, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Settings, MapPin, Power } from "lucide-react";
import Link from "next/link";
import { checkAdminSession, loginAdmin, logoutAdmin, getTodaysLogs, clearHistory, getMonthlyStats, getLogsByDate, getSystemSettings, updateSystemSetting } from "../actions";
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
    const [tab, setTab] = useState<"dashboard" | "calendar" | "qr" | "settings">("dashboard");
    const [hostUrl, setHostUrl] = useState("");

    // Calendar State
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
    const [monthlyStats, setMonthlyStats] = useState<{ [key: string]: number }>({});
    const [selectedLogs, setSelectedLogs] = useState<ScanRecord[]>([]);

    // Settings State
    const [settings, setSettings] = useState<any>({});
    const [updatingSettings, setUpdatingSettings] = useState(false);

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
        if (!confirm("현재 위치를 교회 위치로 설정하시겠습니까?\n이후 이 위치에서 반경 500m 이내만 출석이 허용됩니다.")) return;

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
            <div className="flex w-full bg-white/5 p-1 rounded-xl mb-6 overflow-x-auto">
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

            {tab === "dashboard" ? (
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
            ) : tab === "calendar" ? (
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
            ) : tab === "settings" ? (
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
                            등록되면 반경 500m 이내에서만 출석이 가능합니다.
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
            ) : (
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
        </div>
    );
}
