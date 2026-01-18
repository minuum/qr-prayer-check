"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Calculator, Trophy, BookOpen, UserPlus, Heart, HandHeart, Sparkles, CheckCircle2, AlertCircle, Gift, ArrowRight } from "lucide-react";
import clsx from "clsx";

export default function GrowthDashboard() {
    // Simulator State
    const [absent, setAbsent] = useState(0);
    const [bible, setBible] = useState(20);
    const [prayer, setPrayer] = useState(15);
    const [evangelism, setEvangelism] = useState(0);
    const [service, setService] = useState(7);
    const [special, setSpecial] = useState(7);

    // Derived State
    const [score, setScore] = useState(0);
    const [tier, setTier] = useState({ name: "-", desc: "점수를 입력하세요", color: "text-slate-400" });

    useEffect(() => {
        // Calculation Logic
        // 1. Attendance (30pts): 1 absence allows full points.
        // Formula: Max 30. From 2nd absence, pro-rated over 13 weeks.
        let attScore = 0;
        if (absent <= 1) {
            attScore = 30;
        } else {
            attScore = Math.max(0, 30 * (13 - absent) / 12); // (13 - absent) / (13 - 1)
        }

        // 2. Evangelism (15pts cap): 5pts per person
        const evanScore = Math.min(15, evangelism * 5);

        // Total
        const total = Math.round(attScore + bible + prayer + evanScore + service + special);
        setScore(total);

        // Tier Logic
        if (total >= 90) {
            setTier({ name: "분기 1위 유력 (S등급)", desc: "25,000원 상당 혜택 대상자!", color: "text-yellow-400" });
        } else if (total >= 70) {
            setTier({ name: "기본 선물 확정 (Pass)", desc: "5,000원 상당 선물 획득!", color: "text-teal-400" });
        } else {
            setTier({ name: "격려 대상 (Fail)", desc: "조금만 더 힘내세요! (70점 커트라인)", color: "text-red-400" });
        }
    }, [absent, bible, prayer, evangelism, service, special]);

    // Custom Gauge Chart using SVG
    const GaugeChart = ({ value }: { value: number }) => {
        const radius = 80;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (value / 100) * circumference * 0.75; // 75% circle gauge

        return (
            <div className="relative w-48 h-48 flex items-center justify-center">
                <svg className="w-full h-full transform rotate-[135deg]" viewBox="0 0 200 200">
                    <circle cx="100" cy="100" r={radius} stroke="#1e293b" strokeWidth="20" fill="none" strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`} strokeLinecap="round" />
                    <motion.circle
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: offset }}
                        transition={{ duration: 1, type: "spring" }}
                        cx="100" cy="100" r={radius}
                        stroke={value >= 90 ? "#facc15" : value >= 70 ? "#2dd4bf" : "#f87171"}
                        strokeWidth="20" fill="none"
                        strokeDasharray={`${circumference} ${circumference}`}
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
                    <span className={clsx("text-4xl font-black transition-colors", tier.color)}>{value}</span>
                    <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Total Points</span>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen p-4 pb-20 max-w-2xl mx-auto font-[family-name:var(--font-geist-sans)]">

            {/* Header */}
            <div className="flex items-center gap-4 mb-8 pt-4">
                <Link href="/" className="p-2 bg-white/5 rounded-xl text-slate-400 hover:text-white transition-colors border border-white/10">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-black text-white">성장 대시보드</h1>
                    <p className="text-xs text-slate-400">2026 청년대학부 비전</p>
                </div>
            </div>

            {/* Intro Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-teal-900/50 to-emerald-900/20 border border-teal-500/30 p-6 rounded-3xl mb-8 relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Trophy className="w-32 h-32 text-teal-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">영적으로 더 깊이, 2026</h2>
                <p className="text-sm text-teal-100/80 mb-4 leading-relaxed max-w-[80%]">
                    예배, 말씀, 기도의 균형 잡힌 성장을 통해<br />
                    주님과 더 가까워지는 한 해가 되길 소망합니다.
                </p>
                <div className="flex gap-2">
                    <span className="text-[10px] font-bold bg-teal-500/20 text-teal-300 px-3 py-1 rounded-full border border-teal-500/30">
                        #예배자
                    </span>
                    <span className="text-[10px] font-bold bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full border border-blue-500/30">
                        #말씀통독
                    </span>
                    <span className="text-[10px] font-bold bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full border border-purple-500/30">
                        #기도생활
                    </span>
                </div>
            </motion.div>

            {/* Simulator Section */}
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-yellow-400" /> 점수 시뮬레이터
            </h2>

            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-8 backdrop-blur-sm">
                <div className="flex flex-col md:flex-row items-center gap-8 mb-8">
                    <GaugeChart value={score} />
                    <div className="text-center md:text-left flex-1 space-y-2 p-4 bg-white/5 rounded-2xl border border-white/5 w-full">
                        <p className="text-sm text-slate-400">예상 결과</p>
                        <h3 className={clsx("text-xl font-bold", tier.color)}>{tier.name}</h3>
                        <p className="text-xs text-slate-300">{tier.desc}</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Attendance */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-300 font-medium">주일 오후 모임 결석 (30점)</span>
                            <span className="text-red-400 font-bold">{absent}회</span>
                        </div>
                        <input
                            type="range" min="0" max="13"
                            value={absent} onChange={(e) => setAbsent(parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
                        />
                        <p className="text-[10px] text-slate-500 text-right">분기당 1회 결석까지 만점 처리</p>
                    </div>

                    {/* Bible */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-300 font-medium">성경 통독 현황 (20점)</span>
                            <span className="text-blue-400 font-bold">{bible}점</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1">
                            {[20, 15, 10, 5].map((pts, idx) => {
                                const labels = ["Perfect", "Good", "Warning", "Danger"];
                                const days = ["0일", "1~7일", "8~14일", "15일+"];
                                return (
                                    <button
                                        key={pts}
                                        onClick={() => setBible(pts)}
                                        className={clsx(
                                            "flex flex-col items-center justify-center p-2 rounded-lg border transition-all",
                                            bible === pts
                                                ? "bg-blue-500/20 border-blue-500 text-white"
                                                : "bg-white/5 border-transparent text-slate-500 hover:bg-white/10"
                                        )}
                                    >
                                        <span className="text-xs font-bold">{labels[idx]}</span>
                                        <span className="text-[10px] opacity-70">{days[idx]}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Prayer */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-300 font-medium">주중 기도회 (15점)</span>
                            <span className="text-purple-400 font-bold">{prayer}점</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                            <button onClick={() => setPrayer(15)} className={clsx("p-2 rounded-lg text-xs font-bold border", prayer === 15 ? "bg-purple-500/20 border-purple-500 text-white" : "bg-white/5 border-transparent text-slate-500")}>완주 (15)</button>
                            <button onClick={() => setPrayer(8)} className={clsx("p-2 rounded-lg text-xs font-bold border", prayer === 8 ? "bg-purple-500/20 border-purple-500 text-white" : "bg-white/5 border-transparent text-slate-500")}>부분 (8)</button>
                            <button onClick={() => setPrayer(0)} className={clsx("p-2 rounded-lg text-xs font-bold border", prayer === 0 ? "bg-purple-500/20 border-purple-500 text-white" : "bg-white/5 border-transparent text-slate-500")}>미참여 (0)</button>
                        </div>
                    </div>

                    {/* Evangelism */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-300 font-medium">전도 및 정착 (15점)</span>
                            <span className="text-teal-400 font-bold">{evangelism}명</span>
                        </div>
                        <input
                            type="range" min="0" max="5"
                            value={evangelism} onChange={(e) => setEvangelism(parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
                        />
                        <p className="text-[10px] text-slate-500 text-right">새가족 1명당 5점 (최대 15점)</p>
                    </div>

                    {/* Sub Scores */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <span className="text-slate-300 font-medium text-xs block">봉사 (10점)</span>
                            <select
                                value={service} onChange={(e) => setService(parseInt(e.target.value))}
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white outline-none focus:border-teal-500"
                            >
                                <option value="10">매우 우수 (10)</option>
                                <option value="7">보통 (7)</option>
                                <option value="3">노력 필요 (3)</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <span className="text-slate-300 font-medium text-xs block">사역자 평가 (10점)</span>
                            <select
                                value={special} onChange={(e) => setSpecial(parseInt(e.target.value))}
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white outline-none focus:border-teal-500"
                            >
                                <option value="10">매우 우수 (10)</option>
                                <option value="7">보통 (7)</option>
                                <option value="3">노력 필요 (3)</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Metrics Breakdown - Visual List instead of Chart for mobile readability */}
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-400" /> 평가 기준 상세
            </h2>
            <div className="grid grid-cols-1 gap-3 mb-8">
                <div className="bg-white/5 p-4 rounded-xl border-l-4 border-teal-500 flex items-start gap-3">
                    <BookOpen className="w-5 h-5 text-teal-500 mt-1 shrink-0" />
                    <div>
                        <h3 className="text-sm font-bold text-white">주일 오후 모임 (30점)</h3>
                        <p className="text-xs text-slate-400 mt-1">1회 결석까지는 만점(30점). 이후 비례 감점.</p>
                    </div>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border-l-4 border-blue-500 flex items-start gap-3">
                    <BookOpen className="w-5 h-5 text-blue-500 mt-1 shrink-0" />
                    <div>
                        <h3 className="text-sm font-bold text-white">성경 통독 (20점)</h3>
                        <p className="text-xs text-slate-400 mt-1">갓피플 성경앱 기준 '밀린 날짜' 0일 시 만점.</p>
                    </div>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border-l-4 border-purple-500 flex items-start gap-3">
                    <HandHeart className="w-5 h-5 text-purple-500 mt-1 shrink-0" />
                    <div>
                        <h3 className="text-sm font-bold text-white">주중 기도회 (15점)</h3>
                        <p className="text-xs text-slate-400 mt-1">분기별 공지되는 기준에 따라 점수 부여.</p>
                    </div>
                </div>
            </div>

            {/* Rewards Section */}
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Gift className="w-5 h-5 text-pink-400" /> 시상 및 혜택
            </h2>
            <div className="grid gap-4 mb-8">
                <div className="bg-gradient-to-r from-yellow-500/20 to-amber-700/20 border border-yellow-500/30 p-5 rounded-xl flex justify-between items-center">
                    <div>
                        <span className="bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full">1st Place</span>
                        <h3 className="text-lg font-bold text-white mt-1">분기 전체 1위</h3>
                        <p className="text-xs text-slate-400">기본 선물 + 2만원 추가 상품권</p>
                    </div>
                    <span className="text-xl font-black text-yellow-400">₩25,000</span>
                </div>

                <div className="bg-gradient-to-r from-teal-500/20 to-cyan-700/20 border border-teal-500/30 p-5 rounded-xl flex justify-between items-center">
                    <div>
                        <span className="bg-teal-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full">Pass (70점↑)</span>
                        <h3 className="text-lg font-bold text-white mt-1">성장 격려상</h3>
                        <p className="text-xs text-slate-400">70점 통과자 전원 (최대 12명)</p>
                    </div>
                    <span className="text-xl font-black text-teal-400">₩5,000</span>
                </div>

                <div className="bg-gradient-to-r from-pink-500/20 to-rose-700/20 border border-pink-500/30 p-5 rounded-xl flex justify-between items-center">
                    <div>
                        <span className="bg-pink-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full">Special</span>
                        <h3 className="text-lg font-bold text-white mt-1">담당 사역자 특별상</h3>
                        <p className="text-xs text-slate-400">영적 성장 및 헌신 지체</p>
                    </div>
                    <span className="text-xl font-black text-pink-400">₩20,000</span>
                </div>
            </div>

            {/* Minister Info */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl text-center">
                <h3 className="text-white font-bold mb-4 flex items-center justify-center gap-2">
                    <Sparkles className="w-4 h-4 text-yellow-500" /> 사역자 특별 기준
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                    <div className="bg-white/5 p-4 rounded-xl">
                        <Heart className="w-6 h-6 text-pink-500 mb-2" />
                        <h4 className="text-sm font-bold text-white">한 영혼 사랑</h4>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">장결자 연락, 소외된 지체 케어 등 화평을 위해 애쓰는 피스메이커</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-xl">
                        <UserPlus className="w-6 h-6 text-green-500 mb-2" />
                        <h4 className="text-sm font-bold text-white">영적 성장 열정</h4>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">신앙 고민 공유, 말씀과 기도 생활에 뚜렷한 진전을 보이는 지체</p>
                    </div>
                </div>
            </div>

        </div>
    );
}
