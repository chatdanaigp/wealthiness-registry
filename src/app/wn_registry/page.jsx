'use client';

import Link from 'next/link';

import { 
    AlertCircle, 
    ArrowLeft, 
    Shield, 
    Crown, 
    Sparkles, 
    CheckCircle,
    Lock
} from 'lucide-react';

export default function RegisterClosedPage() {
    return (
        <main className="min-h-screen relative overflow-hidden bg-[#0A0A0B]">
            {/* Background Effects */}
            <div className="absolute inset-0">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-wealth/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-wealth-light/5 rounded-full blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-discord/5 rounded-full blur-3xl"></div>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(37,99,235,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(37,99,235,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
            </div>

            <div className="relative z-10 max-w-2xl mx-auto px-4 py-12 sm:py-20 flex flex-col items-center justify-center min-h-screen">
                {/* Minimal Header */}
                <div className="mb-10 text-center animate-fadeInUp">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-light border border-white/5 mb-6">
                        <Lock className="w-4 h-4 text-wealth-light" />
                        <span className="text-sm text-wealth-light font-medium uppercase tracking-wider">Registration Closed</span>
                    </div>
                    
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 tracking-tight">
                        <span className="wealth-gradient block mb-2">Campaign End</span>
                        <span className="text-white">หมดเวลาแคมเปญ</span>
                    </h1>
                </div>

                <div className="glass rounded-3xl p-8 sm:p-12 text-center border-white/5 shadow-2xl relative overflow-hidden max-w-lg w-full">
                    {/* Status Circle */}
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-wealth/20 to-discord/20 flex items-center justify-center mx-auto mb-8 border border-white/10 group">
                        <Shield className="w-12 h-12 text-wealth-light opacity-80 group-hover:scale-110 transition-transform duration-500" />
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-4">ขอบคุณที่ให้ความสนใจ</h2>
                    <p className="text-text-secondary text-lg mb-10 leading-relaxed">
                        ขณะนี้แคมเปญลงทะเบียนรับ VIP Access ได้สิ้นสุดลงแล้ว 
                        <br />
                        กรุณาติดตามเราเพื่อไม่ให้พลาดกิจกรรมในรอบถัดไป
                    </p>

                    <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-10"></div>

                    {/* Info */}
                    <div className="flex flex-col gap-4 text-left">
                        <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                            <Sparkles className="w-6 h-6 text-wealth-light flex-shrink-0" />
                            <div>
                                <p className="text-white font-medium">Coming Soon</p>
                                <p className="text-sm text-gray-400">เตรียมพบกับแคมเปญใหม่ และสิทธิพิเศษมากมายเร็วๆ นี้</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Return Home Link - Plain HTML anchor to avoid component issues in minimal mode */}
                <a 
                    href="/"
                    className="mt-12 inline-flex items-center gap-2 text-text-secondary hover:text-white transition-all duration-300 group"
                >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    <span className="font-medium tracking-wide underline-offset-8 hover:underline italic">Back to home</span>
                </a>
            </div>
        </main>
    );
}
