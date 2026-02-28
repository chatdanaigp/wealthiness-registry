// ============================================================
// Campaign Closed — restore _page_original.jsx to reopen
// ============================================================
import { TrendingUp } from 'lucide-react';

export default function Home() {
    return (
        <main className="min-h-screen relative overflow-hidden flex items-center justify-center">
            {/* Background Effects */}
            <div className="absolute inset-0">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-wealth/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-wealth-light/5 rounded-full blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-wealth/5 rounded-full blur-3xl"></div>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(37,99,235,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(37,99,235,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
            </div>

            <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-12">
                <div className="max-w-lg w-full">
                    {/* Main Card */}
                    <div className="glass rounded-3xl p-8 sm:p-12 text-center animate-fadeIn">
                        {/* Logo */}
                        <div className="flex justify-center mb-8">
                            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-wealth to-wealth-light flex items-center justify-center wealth-glow">
                                <TrendingUp className="w-12 h-12 text-white" />
                            </div>
                        </div>

                        {/* Brand */}
                        <h1 className="text-3xl sm:text-4xl font-bold mb-6">
                            <span className="wealth-gradient">Wealthiness</span>
                            <span className="text-white"> Registry</span>
                        </h1>

                        {/* Divider */}
                        <div className="w-16 h-1 bg-gradient-to-r from-wealth to-wealth-light rounded-full mx-auto mb-8"></div>

                        {/* Campaign Closed Message */}
                        <div className="space-y-3 mb-8">
                            <p className="text-white text-xl font-semibold">
                                แคมเปญรอบนี้สิ้นสุดแล้วครับ
                            </p>
                            <p className="text-text-secondary text-base leading-relaxed">
                                ขอบคุณทุกท่านที่ให้ความสนใจและเข้าร่วมในครั้งนี้<br />
                                ขอบคุณจากใจครับ 🙏
                            </p>
                        </div>

                        {/* Divider */}
                        <div className="pt-6 border-t border-white/10">
                            <p className="text-text-secondary text-sm">
                                © Wealthiness Trading Community
                            </p>
                        </div>
                    </div>

                    {/* Bottom Glow */}
                    <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-3/4 h-20 bg-wealth/20 blur-3xl rounded-full"></div>
                </div>
            </div>
        </main>
    );
}
