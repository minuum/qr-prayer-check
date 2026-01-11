"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Phone, CheckCircle, Loader2 } from "lucide-react";
import { checkIn } from "../actions";
import confetti from "canvas-confetti";

export default function CheckInPage() {
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<"idle" | "success" | "already">("idle");
    const [msg, setMsg] = useState("");

    // Load saved user
    useEffect(() => {
        const saved = localStorage.getItem("user_info");
        if (saved) {
            const parsed = JSON.parse(saved);
            setName(parsed.name);
            setPhone(parsed.phone);
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !phone) return;

        setLoading(true);

        // Save for next time
        localStorage.setItem("user_info", JSON.stringify({ name, phone }));

        try {
            const res = await checkIn(name, phone);
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
            alert("오류가 발생했습니다.");
            setLoading(false);
        }
    };

    if (status === "success" || status === "already") {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-8 animate-in fade-in zoom-in duration-500">
                <div className="relative">
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

                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 w-full max-w-sm">
                    <p className="text-sm text-slate-400">일시</p>
                    <p className="text-lg font-mono text-emerald-400">
                        {new Date().toLocaleTimeString()}
                    </p>
                </div>

                <p className="text-xs text-slate-500 mt-8">화면을 닫으셔도 좋습니다.</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 max-w-md mx-auto relative font-[family-name:var(--font-geist-sans)]">
            <div className="w-full space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        2026 주중기도회
                    </h1>
                    <p className="text-slate-400">이름과 전화번호를 입력하여<br />출석을 체크해주세요</p>
                </div>

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
                        {loading && <Loader2 className="animate-spin w-5 h-5" />}
                        {loading ? "처리중..." : "출석체크 하기"}
                    </button>
                </form>

                <p className="text-center text-xs text-slate-600">
                    입력하신 정보는 출석 확인 용도로만 사용됩니다.
                </p>
            </div>
        </div>
    );
}
