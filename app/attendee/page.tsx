"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeCanvas } from "qrcode.react";
import { User, Phone, Edit, ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { registerAttendee } from "../actions";

interface AttendeeInfo {
    id: string; // UUID from DB
    name: string;
    phone: string;
}

export default function AttendeePage() {
    const [info, setInfo] = useState<AttendeeInfo | null>(null);
    const [nameInput, setNameInput] = useState("");
    const [phoneInput, setPhoneInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const saved = localStorage.getItem("attendee_session_v2");
        if (saved) {
            setInfo(JSON.parse(saved));
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nameInput || !phoneInput) return;

        setLoading(true);
        try {
            const result = await registerAttendee(nameInput, phoneInput);
            if (result.success && result.data) {
                const newInfo = result.data as AttendeeInfo;
                localStorage.setItem("attendee_session_v2", JSON.stringify(newInfo));
                setInfo(newInfo);
            } else {
                alert(result.error || "오류가 발생했습니다.");
            }
        } catch (err) {
            console.error(err);
            alert("네트워크 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        if (confirm("정말 정보를 수정하시겠습니까?")) {
            localStorage.removeItem("attendee_session_v2");
            setInfo(null);
            setNameInput(info?.name || "");
            setPhoneInput(info?.phone || "");
        }
    };

    if (!mounted) return null;

    return (
        <div className="min-h-screen p-6 flex flex-col items-center max-w-md mx-auto relative font-[family-name:var(--font-geist-sans)]">
            <Link href="/" className="absolute top-6 left-6 text-slate-400 hover:text-white transition-colors">
                <ArrowLeft />
            </Link>

            <div className="w-full flex-1 flex flex-col items-center justify-center pt-12">
                <AnimatePresence mode="wait">
                    {!info ? (
                        <motion.div
                            key="form"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="w-full space-y-8"
                        >
                            <div className="text-center space-y-2">
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                                    참석자 등록
                                </h1>
                                <p className="text-slate-400">기도회 출석을 위한 정보를 입력해주세요</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm text-slate-400 ml-1">이름</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                                        <input
                                            type="text"
                                            value={nameInput}
                                            onChange={(e) => setNameInput(e.target.value)}
                                            placeholder="홍길동"
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm text-slate-400 ml-1">전화번호 (뒷 4자리)</label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                                        <input
                                            type="text"
                                            value={phoneInput}
                                            onChange={(e) => setPhoneInput(e.target.value)}
                                            placeholder="1234"
                                            maxLength={4}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all"
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-primary to-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {loading && <Loader2 className="animate-spin w-5 h-5" />}
                                    {loading ? "등록 중..." : "QR코드 생성하기"}
                                </button>
                            </form>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="pass"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="w-full flex flex-col items-center gap-8"
                        >
                            <div className="text-center space-y-1">
                                <h2 className="text-2xl font-bold text-white">{info.name}님</h2>
                                <p className="text-primary font-medium">2026 주중기도회 패스</p>
                            </div>

                            <div className="p-8 bg-white rounded-3xl shadow-2xl shadow-primary/20 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-blue-500/10 opacity-50" />
                                <div className="relative z-10">
                                    <QRCodeCanvas
                                        value={info.id} // UUID only
                                        title={`${info.name} ${info.phone}`}
                                        size={200}
                                        level="H"
                                        bgColor="#FFFFFF"
                                        fgColor="#000000"
                                        marginSize={2}
                                    />
                                </div>
                                {/* Scan me visual cue */}
                                <div className="absolute inset-0 border-[6px] border-primary/20 rounded-3xl" />
                            </div>

                            <div className="text-center space-y-4">
                                <p className="text-slate-400 text-sm">
                                    입장 시 스태프에게 이 화면을 보여주세요
                                </p>

                                <div className="flex items-center justify-center gap-2 text-emerald-400 bg-emerald-400/10 px-4 py-2 rounded-full text-sm font-medium">
                                    <CheckCircle className="w-4 h-4" />
                                    <span>등록 완료</span>
                                </div>
                            </div>

                            <button
                                onClick={handleReset}
                                className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-sm mt-8"
                            >
                                <Edit className="w-4 h-4" />
                                정보 수정하기
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
