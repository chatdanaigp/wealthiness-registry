'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    User,
    Phone,
    MapPin,
    Upload,
    CheckCircle,
    Loader2,
    ExternalLink,
    Shield,
    Crown,
    Sparkles,
    AlertCircle,
    ArrowLeft,
    Hash,
    UserPlus
} from 'lucide-react';

const DISCORD_CLIENT_ID = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
const REDIRECT_URI = typeof window !== 'undefined'
    ? `${window.location.origin}/api/auth/discord/callback`
    : '';

export default function RegisterPage() {
    const [step, setStep] = useState('discord'); // 'discord' | 'form' | 'pending'
    const [discordUser, setDiscordUser] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const [formData, setFormData] = useState({
        connextId: '',
        referalId: '',
        nickname: '',
        name: '',
        surname: '',
        provinceCountry: '',
        phoneNumber: '',
        transferSlip: null,
    });

    // Check for Discord callback on mount
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const discordData = params.get('discord');
        const errorParam = params.get('error');

        if (errorParam) {
            setError(`Discord login failed: ${errorParam}`);
        }

        if (discordData) {
            try {
                const userData = JSON.parse(decodeURIComponent(discordData));
                setDiscordUser(userData);

                // Check if user is already registered (using Username as requested)
                checkUserStatus(userData.username, userData);

                // Clean URL
                window.history.replaceState({}, '', '/wn_registry');
            } catch (e) {
                console.error('Failed to parse Discord data:', e);
                setError('Failed to parse Discord data');
            }
        }
    }, []);

    const checkUserStatus = async (username, userData) => {
        setIsLoading(true);
        try {
            // Fetch status from Google Apps Script (via Client-side call or create a nextjs proxy if preferred, 
            // but for simplicity we'll check via a server action or proxy to avoid CORS if possible, 
            // OR assumes NextJS API route proxies it. 
            // Wait, we need a proxy route to call GAS doGet. 
            // Let's modify the frontend to call a new API route `/api/status`.

            const response = await fetch(`/api/status?username=${username}`);
            const data = await response.json();

            if (data.found && data.status === 'approved') {
                setStep('status_approved'); // New Step
                // Add status data to state if needed
                setFormData(prev => ({ ...prev, expiresAt: data.expiresAt }));
            } else if (data.found && data.status === 'pending') {
                setStep('pending');
            } else {
                setStep('form');
            }
        } catch (e) {
            console.error('Check status failed, defaulting to form:', e);
            setStep('form');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDiscordLogin = () => {
        const scope = 'identify';
        const authUrl = `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${scope}`;
        window.location.href = authUrl;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                setError('ไฟล์มีขนาดใหญ่เกิน 10MB');
                return;
            }
            setFormData(prev => ({ ...prev, transferSlip: file }));
            setError(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            // Create FormData for file upload
            const submitData = new FormData();
            submitData.append('connextId', formData.connextId);
            submitData.append('referalId', formData.referalId);
            submitData.append('nickname', formData.nickname);
            submitData.append('name', formData.name);
            submitData.append('surname', formData.surname);
            submitData.append('provinceCountry', formData.provinceCountry);
            submitData.append('phoneNumber', formData.phoneNumber);
            submitData.append('discordId', discordUser?.id || '');
            submitData.append('discordUsername', discordUser?.username || '');
            if (formData.transferSlip) {
                submitData.append('transferSlip', formData.transferSlip);
            }

            const response = await fetch('/api/register', {
                method: 'POST',
                body: submitData,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'การลงทะเบียนล้มเหลว');
            }

            setStep('pending');
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const isFormValid = () => {
        return (
            formData.connextId &&
            formData.nickname &&
            formData.name &&
            formData.surname &&
            formData.provinceCountry &&
            formData.phoneNumber &&
            formData.transferSlip
        );
    };

    return (
        <main className="min-h-screen relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gold/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gold-light/5 rounded-full blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-discord/5 rounded-full blur-3xl"></div>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(212,175,55,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(212,175,55,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
            </div>

            <div className="relative z-10 max-w-2xl mx-auto px-4 py-12 sm:py-20">
                {/* Back Button */}
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-text-secondary hover:text-white transition-colors mb-6"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span>กลับหน้าหลัก</span>
                </Link>

                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
                        <Crown className="w-4 h-4 text-gold" />
                        <span className="text-sm text-gold font-medium">7-Day VIP Access</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
                        <span className="gold-gradient">ลงทะเบียนสมาชิก</span>
                    </h1>
                    <p className="text-text-secondary text-lg">
                        เข้าร่วม Wealthiness Trading Community
                    </p>
                </div>

                {/* Discord Login Step */}
                {step === 'discord' && (
                    <div className="glass rounded-2xl p-8 sm:p-10 text-center animate-fadeIn">
                        <div className="w-20 h-20 rounded-2xl bg-discord/20 flex items-center justify-center mx-auto mb-6">
                            <svg className="w-12 h-12 text-discord" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                            </svg>
                        </div>

                        <h2 className="text-2xl font-bold text-white mb-3">เข้าสู่ระบบด้วย Discord</h2>
                        <p className="text-text-secondary mb-8">
                            กรุณายืนยันตัวตนผ่าน Discord ก่อนลงทะเบียน
                        </p>

                        {error && (
                            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl mb-6 text-red-400">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <p>{error}</p>
                            </div>
                        )}

                        <button
                            onClick={handleDiscordLogin}
                            className="btn-discord w-full sm:w-auto"
                        >
                            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                            </svg>
                            เข้าสู่ระบบด้วย Discord
                        </button>

                        <div className="mt-8 flex items-center justify-center gap-3 text-text-secondary text-sm">
                            <Shield className="w-4 h-4 text-green" />
                            <span>ข้อมูลของคุณจะถูกเก็บรักษาอย่างปลอดภัย</span>
                        </div>
                    </div>
                )}

                {/* Registration Form Step */}
                {step === 'form' && (
                    <div className="glass rounded-2xl p-6 sm:p-8 animate-fadeIn">
                        {/* Discord User Info */}
                        {discordUser && (
                            <div className="flex items-center gap-4 p-4 bg-discord/10 rounded-xl mb-8 border border-discord/20">
                                <img
                                    src={discordUser.avatar
                                        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png?size=64`
                                        : `https://cdn.discordapp.com/embed/avatars/${parseInt(discordUser.discriminator || '0') % 5}.png`
                                    }
                                    alt="Discord Avatar"
                                    className="w-14 h-14 rounded-full border-2 border-discord"
                                />
                                <div>
                                    <p className="text-white font-semibold text-lg">
                                        {discordUser.global_name || discordUser.username}
                                    </p>
                                    <p className="text-text-secondary text-sm">
                                        @{discordUser.username}
                                    </p>
                                </div>
                                <CheckCircle className="w-6 h-6 text-green ml-auto" />
                            </div>
                        )}

                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-gold" />
                            กรอกข้อมูลลงทะเบียน
                        </h2>

                        {error && (
                            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl mb-6 text-red-400">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <p>{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Connext Client ID */}
                            <div>
                                <label className="block text-sm font-medium text-white mb-2">
                                    <Hash className="w-4 h-4 inline mr-1" />
                                    Connext Client ID <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="connextId"
                                    value={formData.connextId}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        if (val.length <= 5) {
                                            handleInputChange({ target: { name: 'connextId', value: val } });
                                        }
                                    }}
                                    placeholder="กรอกตัวเลข 5 หลัก"
                                    className="form-input"
                                    required
                                    maxLength={5}
                                    inputMode="numeric"
                                />
                                <p className="mt-1 text-xs text-text-secondary">ตัวเลข 5 หลักจาก Connext FX</p>
                            </div>

                            {/* Referal ID */}
                            <div>
                                <label className="block text-sm font-medium text-white mb-2">
                                    <UserPlus className="w-4 h-4 inline mr-1" />
                                    Referal ID <span className="text-text-secondary">(ถ้ามี)</span>
                                </label>
                                <input
                                    type="text"
                                    name="referalId"
                                    value={formData.referalId}
                                    onChange={handleInputChange}
                                    placeholder="ID ผู้แนะนำ (ไม่บังคับ)"
                                    className="form-input"
                                />
                            </div>

                            {/* Nickname */}
                            <div>
                                <label className="block text-sm font-medium text-white mb-2">
                                    Nickname <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="nickname"
                                    value={formData.nickname}
                                    onChange={handleInputChange}
                                    placeholder="ชื่อเล่น"
                                    className="form-input"
                                    required
                                />
                            </div>

                            {/* Name & Surname */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-white mb-2">
                                        <User className="w-4 h-4 inline mr-1" />
                                        ชื่อ (Name) <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        placeholder="ชื่อจริง"
                                        className="form-input"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-white mb-2">
                                        นามสกุล (Surname) <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="surname"
                                        value={formData.surname}
                                        onChange={handleInputChange}
                                        placeholder="นามสกุล"
                                        className="form-input"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Province / Country */}
                            <div>
                                <label className="block text-sm font-medium text-white mb-2">
                                    <MapPin className="w-4 h-4 inline mr-1" />
                                    จังหวัด / ประเทศ <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="provinceCountry"
                                    value={formData.provinceCountry}
                                    onChange={handleInputChange}
                                    placeholder="เช่น กรุงเทพ / Thailand"
                                    className="form-input"
                                    required
                                />
                            </div>

                            {/* Phone Number */}
                            <div>
                                <label className="block text-sm font-medium text-white mb-2">
                                    <Phone className="w-4 h-4 inline mr-1" />
                                    เบอร์โทรศัพท์ <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="tel"
                                    name="phoneNumber"
                                    value={formData.phoneNumber}
                                    onChange={handleInputChange}
                                    placeholder="08X-XXX-XXXX"
                                    className="form-input"
                                    required
                                />
                            </div>

                            {/* Transfer Slip Upload */}
                            <div>
                                <label className="block text-sm font-medium text-white mb-3">
                                    <Upload className="w-4 h-4 inline mr-1" />
                                    หลักฐานการโอนเงิน (Payment Slip) <span className="text-red-400">*</span>
                                </label>
                                <div className={`file-upload ${formData.transferSlip ? 'has-file' : ''}`}>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        required
                                    />
                                    {formData.transferSlip ? (
                                        <div className="flex items-center justify-center gap-3">
                                            <CheckCircle className="w-8 h-8 text-green" />
                                            <div className="text-left">
                                                <p className="text-white font-medium">{formData.transferSlip.name}</p>
                                                <p className="text-text-secondary text-sm">
                                                    {(formData.transferSlip.size / 1024 / 1024).toFixed(2)} MB
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <Upload className="w-10 h-10 text-gold mx-auto mb-2" />
                                            <p className="text-white font-medium">คลิกเพื่ออัพโหลดรูปภาพ</p>
                                            <p className="text-text-secondary text-sm mt-1">PNG, JPG หรือ JPEG (สูงสุด 10MB)</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={!isFormValid() || isLoading}
                                className="btn-gold w-full py-4 text-lg mt-6"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        กำลังส่งข้อมูล...
                                    </>
                                ) : (
                                    <>
                                        ส่งข้อมูลลงทะเบียน
                                        <ExternalLink className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                )}

                {/* Pending Approval Step */}
                {step === 'pending' && (
                    <div className="glass rounded-2xl p-8 sm:p-12 text-center animate-fadeIn">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gold/20 to-gold-light/20 flex items-center justify-center mx-auto mb-6 animate-pulse-gold">
                            <CheckCircle className="w-12 h-12 text-green" />
                        </div>

                        <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                            <span className="gold-gradient">รอการอนุมัติ</span>
                        </h2>

                        <p className="text-text-secondary text-lg mb-6">
                            ข้อมูลของคุณถูกส่งเรียบร้อยแล้ว<br />
                            กรุณารอการอนุมัติจากแอดมิน
                        </p>

                        <div className="glass rounded-xl p-4 inline-flex items-center gap-3 mb-8">
                            <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                            <span className="text-yellow-500 font-medium">รอการตรวจสอบ</span>
                        </div>

                        <div className="space-y-3 text-text-secondary text-sm max-w-md mx-auto mb-8">
                            <p className="flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-green flex-shrink-0 mt-0.5" />
                                <span className="text-left">แอดมินจะตรวจสอบหลักฐานการโอนเงินของคุณ</span>
                            </p>
                            <p className="flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-green flex-shrink-0 mt-0.5" />
                                <span className="text-left">เมื่ออนุมัติ คุณจะได้รับ VIP Role บน Discord โดยอัตโนมัติ</span>
                            </p>
                            <p className="flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-green flex-shrink-0 mt-0.5" />
                                <span className="text-left">VIP Role จะมีอายุ 7 วัน นับจากวันที่อนุมัติ</span>
                            </p>
                        </div>

                        <div className="pt-6 border-t border-white/10">
                            <p className="text-white font-semibold mb-4 text-lg">⚡ ขั้นตอนถัดไป: เข้าร่วม Discord Server</p>
                            <a
                                href="https://discord.gg/TvzpxV7Wzx"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-discord inline-flex gap-2"
                            >
                                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                                </svg>
                )}

                                {/* Approved Status Step */}
                                {step === 'status_approved' && (
                                    <div className="glass rounded-2xl p-8 sm:p-12 text-center animate-fadeIn">
                                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green/20 to-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                                            <CheckCircle className="w-12 h-12 text-green" />
                                        </div>

                                        <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                                            <span className="text-white">คุณได้รับสิทธิ์ VIP แล้ว</span>
                                        </h2>

                                        <div className="glass rounded-xl p-6 mb-8 border border-gold/30">
                                            <p className="text-text-secondary mb-2">สถานะสมาชิก</p>
                                            <div className="flex items-center justify-center gap-2 text-gold text-xl font-bold mb-4">
                                                <Crown className="w-6 h-6" />
                                                7-Day VIP Access
                                            </div>

                                            {formData.expiresAt && (
                                                <div className="text-sm border-t border-white/10 pt-4 mt-2">
                                                    <p className="text-text-secondary mb-1">วันหมดอายุ (Expiry Date)</p>
                                                    <p className="text-white text-lg font-mono">
                                                        {new Date(formData.expiresAt).toLocaleDateString('th-TH', {
                                                            year: 'numeric',
                                                            month: 'long',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        <a
                                            href="https://discord.gg/TvzpxV7Wzx"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn-discord inline-flex gap-2 w-full justify-center"
                                        >
                                            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                                            </svg>
                                            เข้าร่วม Discord Server
                                            <ExternalLink className="w-5 h-5" />
                                        </a>
                                        <p className="text-text-secondary text-sm mt-3">คุณต้องเข้า Server ก่อน จึงจะได้รับ VIP Role เมื่ออนุมัติ</p>
                                    </div>
                    </div>
                )}
                    </div>
        </main>
    );
}
