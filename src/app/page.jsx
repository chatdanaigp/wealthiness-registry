'use client';

import { Crown, TrendingUp, Sparkles, Heart } from 'lucide-react';

export default function Home() {
    return (
        <main className="min-h-screen relative overflow-hidden bg-[#0A0A0B]">
            {/* Background Effects */}
            <div className="absolute inset-0">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-wealth/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-wealth-light/5 rounded-full blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-wealth/5 rounded-full blur-3xl"></div>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(37,99,235,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(37,99,235,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
            </div>

            <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-12">
                <div className="max-w-xl w-full">
                    {/* Main Card */}
                    <div className="glass rounded-3xl p-8 sm:p-12 text-center animate-fadeIn border-wealth/20 shadow-2xl shadow-wealth/5">
                        {/* Status Icon */}
                        <div className="flex justify-center mb-8">
                            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center border border-white/10 relative">
                                <Sparkles className="w-12 h-12 text-wealth-light opacity-50" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <TrendingUp className="w-10 h-10 text-white" />
                                </div>
                            </div>
                        </div>

                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6 transition-all hover:border-wealth/30">
                            <Crown className="w-4 h-4 text-wealth-light" />
                            <span className="text-sm text-gray-300 font-medium">Wealthiness Registration</span>
                        </div>

                        {/* Headlines */}
                        <h1 className="text-3xl sm:text-4xl font-bold mb-6 tracking-tight">
                            <span className="wealth-gradient block mb-2 text-5xl">ขอบคุณทุกคน</span>
                            <span className="text-white">แคมเปญหมดระยะเวลาแล้ว</span>
                        </h1>

                        <div className="h-px w-20 bg-gradient-to-r from-transparent via-wealth/50 to-transparent mx-auto mb-8"></div>

                        <p className="text-text-secondary text-lg mb-8 leading-relaxed">
                            ขอขอบคุณล่วงหน้าสำหรับการตอบรับอย่างล้นหลาม! 
                            <br />
                            ขณะนี้เราได้ปิดรับลงทะเบียนชั่วคราวเนื่องจากครบกำหนดระยะเวลาแคมเปญแล้ว
                        </p>

                        {/* Note Box */}
                        <div className="glass-light rounded-2xl p-6 mb-8 border border-white/5 bg-white/[0.02]">
                            <div className="flex items-start gap-4 text-left">
                                <Heart className="w-6 h-6 text-wealth-light flex-shrink-0 mt-1" />
                                <div>
                                    <h3 className="text-white font-semibold mb-1">ติดตามประกาศครั้งหน้า</h3>
                                    <p className="text-sm text-gray-400">
                                        สำหรับท่านที่ลงทะเบียนไม่ทัน สามารถติดตามข่าวสารกิจกรรมใหม่ๆ ได้ที่ช่องทางประกาศหลักของเรา
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Support Info */}
                        <p className="text-xs text-gray-500 uppercase tracking-widest font-medium">
                            Wealthiness Trading Community • Next Event Coming Soon
                        </p>
                    </div>

                    {/* Bottom Glow */}
                    <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-3/4 h-20 bg-wealth/10 blur-3xl rounded-full"></div>
                </div>
            </div>
        </main>
    );
}
