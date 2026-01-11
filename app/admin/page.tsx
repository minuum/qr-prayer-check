"use client";

import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { motion } from "framer-motion";
import { ArrowLeft, RefreshCw, Trash2, Lock, Printer, List, Link as LinkIcon, Download } from "lucide-react";
import Link from "next/link";
import { checkAdminSession, loginAdmin, logoutAdmin, getTodaysLogs, clearHistory } from "../actions";

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
    const [tab, setTab] = useState<"dashboard" | "qr">("dashboard");
    const [hostUrl, setHostUrl] = useState("");

    useEffect(() => {
        checkAdminSession().then((valid) => {
            setIsAdmin(valid);
            if (valid) loadLogs();
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

    const handleClear = async () => {
        if (confirm("모든 기록을 삭제하시겠습니까? (복구 불가)")) {
            await clearHistory();
            loadLogs();
        }
    }

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
            <div className="flex w-full bg-white/5 p-1 rounded-xl mb-6">
                <button
                    onClick={() => setTab("dashboard")}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${tab === 'dashboard' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                    <List className="w-4 h-4 inline mr-2" /> 현황판
                </button>
                <button
                    onClick={() => setTab("qr")}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${tab === 'qr' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                    <Printer className="w-4 h-4 inline mr-2" /> QR 출력
                </button>
            </div>

            {tab === "dashboard" ? (
                <div className="w-full space-y-4">
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
            ) : (
                <div className="w-full space-y-6">
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
