"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { QrCode, ClipboardList, Calendar as CalendarIcon, Users, Quote, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth, isSameDay, isAfter, isToday } from "date-fns";
import clsx from "clsx";
import { getPublicStats, getDailyVerse, getSchedules } from "./actions";

interface Schedule {
  id: number;
  title: string;
  date: string;
  type: string;
}

export default function Home() {
  const [stats, setStats] = useState<{ todayCount: number, monthlyStats: { [key: string]: number } }>({ todayCount: 0, monthlyStats: {} });
  const [verse, setVerse] = useState<{ text: string, addr: string } | null>(null);
  const [currentDate] = useState(new Date());
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  useEffect(() => {
    getPublicStats().then(setStats);
    getDailyVerse().then(setVerse);
    getSchedules(currentDate.getFullYear(), currentDate.getMonth() + 1).then(setSchedules);
  }, []);

  // Filter for upcoming schedules (today or future)
  const upcomingSchedules = schedules
    .filter(s => {
      const sDate = new Date(s.date);
      return isToday(sDate) || isAfter(sDate, new Date());
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3); // Show top 3

  const CalendarGrid = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="grid grid-cols-7 gap-1.5 w-full text-center p-4 bg-white/5 rounded-2xl border border-white/10">
        {['일', '월', '화', '수', '목', '금', '토'].map(d => (
          <div key={d} className="text-[10px] text-slate-500 py-1">{d}</div>
        ))}
        {days.map((day, idx) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const count = stats.monthlyStats[dateStr] || 0;
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isTodayDate = isSameDay(day, new Date());
          const hasSchedule = schedules.some(s => s.date === dateStr);

          // Heatmap colors
          let bgClass = "bg-white/5";
          if (count > 0) bgClass = "bg-primary/30";
          if (count > 5) bgClass = "bg-primary/50";
          if (count > 10) bgClass = "bg-primary/70";
          if (count > 20) bgClass = "bg-primary";

          return (
            <div
              key={idx}
              className={clsx(
                "aspect-square rounded-lg flex flex-col items-center justify-center relative transition-all",
                !isCurrentMonth && "opacity-20",
                bgClass,
                isTodayDate && "ring-2 ring-white",
                hasSchedule && "border border-primary"
              )}
              title={`${dateStr}: ${count}명`}
            >
              <span className={clsx("text-[10px] font-medium", count > 10 ? "text-white" : "text-slate-400")}>
                {format(day, "d")}
              </span>
              {hasSchedule && <div className="absolute top-1 right-1 w-1 h-1 bg-primary rounded-full"></div>}
            </div>
          )
        })}
      </div>
    )
  };

  return (
    <div className="flex flex-col items-center min-h-screen p-6 max-w-md mx-auto relative font-[family-name:var(--font-geist-sans)]">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2 mt-8 mb-8"
      >
        <h1 className="text-4xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent drop-shadow-sm">
          2026 주중기도회
        </h1>
        <p className="text-slate-400 font-light tracking-wide">함께 기도의 자리를 지켜주세요</p>
      </motion.div>

      {/* Main Content */}
      <div className="w-full space-y-6 flex-1">

        {/* Live Status */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-primary/20 to-blue-600/10 border border-primary/20 p-5 rounded-3xl flex items-center justify-between"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <span className="text-xs font-bold text-primary uppercase tracking-wider">Live Status</span>
            </div>
            <p className="text-white text-lg font-medium">오늘 기도의 불</p>
          </div>
          <div className="text-right">
            <span className="text-4xl font-black text-white">{stats.todayCount}</span>
            <span className="text-sm text-slate-400 ml-1">명</span>
          </div>
        </motion.div>

        {/* Daily Verse */}
        {verse && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/5 border border-white/10 p-6 rounded-3xl relative overflow-hidden group hover:bg-white/10 transition-colors"
          >
            <Quote className="absolute top-4 right-4 w-8 h-8 text-white/5 -rotate-12 transform group-hover:scale-110 transition-transform" />
            <h3 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Today's Verse</h3>
            <p className="text-white font-serif text-lg leading-relaxed keep-all">
              "{verse.text}"
            </p>
            <p className="text-right text-sm text-primary mt-3 font-medium">
              - {verse.addr}
            </p>
          </motion.div>
        )}

        {/* Public Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-2 mb-3 px-2">
            <CalendarIcon className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-bold text-slate-300">이번 달 우리의 기도</h3>
          </div>
          <CalendarGrid />
        </motion.div>

        {/* Upcoming Schedules */}
        {upcomingSchedules.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="space-y-3"
          >
            <h3 className="text-sm font-bold text-slate-300 px-2">다가오는 일정</h3>
            <div className="space-y-2">
              {upcomingSchedules.map((schedule) => (
                <div key={schedule.id} className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center gap-4">
                  <div className="bg-white/10 p-2 rounded-lg text-center min-w-[50px]">
                    <span className="block text-xs text-slate-400">{format(new Date(schedule.date), "MMM")}</span>
                    <span className="block text-lg font-bold text-white">{format(new Date(schedule.date), "d")}</span>
                  </div>
                  <div>
                    <h4 className="text-white font-bold">{schedule.title}</h4>
                    <p className="text-xs text-slate-500">{format(new Date(schedule.date), "yyyy년 M월 d일 (EEE)", { locale: undefined })}</p>
                    {/* locale is handled by default or we can import ko if needed, for now standard format */}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Navigation Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col gap-4 mt-8 pb-8"
        >
          {/* Main Action: Check-in */}
          <Link href="/check-in" className="group relative overflow-hidden bg-gradient-to-br from-primary to-violet-600 rounded-3xl p-1 transition-all hover:scale-[1.01] active:scale-[0.99] w-full">
            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="bg-black/20 backdrop-blur-sm rounded-[20px] p-6 h-full flex items-center justify-between text-left gap-4">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-white/20 rounded-full text-white">
                  <QrCode className="w-8 h-8" />
                </div>
                <div>
                  <span className="block text-xl font-bold text-white">출석하기</span>
                  <span className="text-xs text-white/70">QR 스캔 / 체크인</span>
                </div>
              </div>
            </div>
          </Link>

          <div className="grid grid-cols-2 gap-4">
            <Link href="/growth" className="group relative overflow-hidden bg-white/5 border border-white/10 rounded-3xl transition-all hover:bg-white/10 active:scale-[0.98]">
              <div className="absolute inset-0 bg-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="p-6 h-full flex flex-col items-center justify-center text-center gap-3">
                <div className="p-3 bg-teal-500/20 rounded-full text-teal-400 group-hover:text-white transition-colors">
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <span className="block text-lg font-bold text-slate-300 group-hover:text-white transition-colors">성장</span>
                  <span className="text-[10px] text-slate-500">비전 대시보드</span>
                </div>
              </div>
            </Link>

            <Link href="/admin" className="group relative overflow-hidden bg-white/5 border border-white/10 rounded-3xl transition-all hover:bg-white/10 active:scale-[0.98]">
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="p-6 h-full flex flex-col items-center justify-center text-center gap-3">
                <div className="p-3 bg-white/5 rounded-full text-slate-400 group-hover:text-white transition-colors">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <span className="block text-lg font-bold text-slate-300 group-hover:text-white transition-colors">관리자</span>
                  <span className="text-[10px] text-slate-500">현황판 확인</span>
                </div>
              </div>
            </Link>
          </div>
        </motion.div>
      </div>
      <footer className="mt-12 text-center text-[10px] text-slate-600 pb-4">
        © 2026 Prayer Meeting. All rights reserved.
      </footer>
    </div>
  );
}
