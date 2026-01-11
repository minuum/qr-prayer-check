"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ClipboardList, UserCheck } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-12 font-[family-name:var(--font-geist-sans)]">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center space-y-4"
      >
        <h1 className="text-4xl sm:text-6xl font-black bg-gradient-to-r from-white via-primary to-accent bg-clip-text text-transparent tracking-tight">
          2026 주중기도회
        </h1>
        <p className="text-lg text-slate-400 font-light">
          함께 기도로 나아가는 시간
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
        <Link href="/check-in" className="group">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="h-64 flex flex-col items-center justify-center gap-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-lg hover:bg-white/10 hover:border-primary/50 transition-all p-8 shadow-2xl"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg group-hover:shadow-primary/50 transition-all">
              <UserCheck className="w-10 h-10 text-white" />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">출석체크</h2>
              <p className="text-sm text-slate-400">QR코드를 스캔하여<br />이곳으로 이동합니다</p>
            </div>
          </motion.div>
        </Link>

        <Link href="/admin" className="group">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="h-64 flex flex-col items-center justify-center gap-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-lg hover:bg-white/10 hover:border-accent/50 transition-all p-8 shadow-2xl"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent to-orange-600 flex items-center justify-center shadow-lg group-hover:shadow-accent/50 transition-all">
              <ClipboardList className="w-10 h-10 text-white" />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">관리자</h2>
              <p className="text-sm text-slate-400">현황판 확인 및<br />QR코드 출력</p>
            </div>
          </motion.div>
        </Link>
      </div>

      <footer className="mt-auto text-xs text-slate-600">
        © 2026 Prayer Meeting. All rights reserved.
      </footer>
    </div>
  );
}
