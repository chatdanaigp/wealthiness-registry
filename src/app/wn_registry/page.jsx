// ============================================================
// Campaign Closed Page
// To re-open: replace this file with _RegisterFormPage.jsx
// ============================================================
export default function RegisterPage() {
    return (
        <main className="min-h-screen relative overflow-hidden flex items-center justify-center">
            {/* Background Effects */}
            <div className="absolute inset-0">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-wealth/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-wealth-light/5 rounded-full blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-discord/5 rounded-full blur-3xl"></div>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(37,99,235,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(37,99,235,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
            </div>

            <div className="relative z-10 max-w-lg mx-auto px-6 text-center">
                <div className="glass rounded-2xl p-12 sm:p-16 animate-fadeIn">
                    {/* Icon */}
                    <div className="w-28 h-28 rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center mx-auto mb-8">
                        <span className="text-6xl">🔒</span>
                    </div>

                    {/* Heading */}
                    <h1 className="text-3xl sm:text-4xl font-bold mb-4">
                        <span className="wealth-gradient">แคมเปญสิ้นสุดแล้ว</span>
                    </h1>

                    {/* Subheading */}
                    <p className="text-white text-lg font-medium mb-3">
                        ขอบคุณทุกท่านที่ให้ความสนใจครับ
                    </p>

                    {/* Body */}
                    <p className="text-text-secondary leading-relaxed">
                        ระบบลงทะเบียน Trial Access รอบนี้ได้ปิดรับแล้วครับ<br />
                        โปรดรอติดตามการประกาศรอบถัดไป
                    </p>

                    {/* Divider */}
                    <div className="mt-10 pt-6 border-t border-white/10">
                        <p className="text-text-secondary text-sm">
                            © Wealthiness Trading Community
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
}
