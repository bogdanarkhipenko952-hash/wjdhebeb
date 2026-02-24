import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Zap, AtSign, Lock, User, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface AuthScreenProps {
  onLogin: (user: any) => void;
}

export default function AuthScreen({ onLogin }: AuthScreenProps) {
  const [step, setStep] = useState<'credentials' | '2fa'>('credentials');
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    twoFactorCode: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  const checkUsername = useCallback(async (username: string) => {
    if (username.length < 1) {
      setUsernameStatus('idle');
      return;
    }
    setUsernameStatus('checking');
    try {
      const res = await fetch(`/api/auth/check-username/${username}`);
      const data = await res.json();
      setUsernameStatus(data.available ? 'available' : 'taken');
    } catch (e) {
      setUsernameStatus('idle');
    }
  }, []);

  useEffect(() => {
    if (!isLogin && formData.username.length >= 1) {
      const timer = setTimeout(() => checkUsername(formData.username), 300);
      return () => clearTimeout(timer);
    } else {
      setUsernameStatus('idle');
    }
  }, [formData.username, isLogin, checkUsername]);

  const handleUsernameChange = (val: string) => {
    let cleaned = val.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setFormData({ ...formData, username: cleaned });
  };

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLogin && usernameStatus === 'taken') {
      setError('Это имя пользователя уже занято');
      return;
    }
    if (formData.username.length >= 1 && formData.password.length >= 1) {
      setStep('2fa');
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    
    // In a real app, we would verify the 2FA code here.
    // For now, we pass it along or just use it as an extra step.
    const payload = {
      username: formData.username,
      password: formData.password,
      name: formData.name || formData.username,
      twoFactorCode: formData.twoFactorCode
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        onLogin(data);
      } else {
        setError(data.error || 'Ошибка авторизации');
      }
    } catch (err) {
      setError('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full bg-black flex items-center justify-center p-4 relative font-sans overflow-y-auto">
      {/* Background Image/Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-10" style={{ backgroundImage: 'url("https://picsum.photos/seed/dark/1920/1080?blur=10")', backgroundSize: 'cover', backgroundPosition: 'center' }} />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-[480px] bg-[#1a1a1a] sm:shadow-2xl rounded-[30px] p-8 relative z-10 flex flex-col border border-white/5"
      >
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <Zap size={32} className="text-indigo-500 fill-indigo-500" />
            <span className="text-2xl font-bold text-white tracking-tight">Pulse messenger</span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 'credentials' ? (
            <motion.div 
              key="credentials"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex flex-col"
            >
              <div className="text-center mb-6">
                <h1 className="text-[24px] font-bold text-white mb-2">
                  {isLogin ? 'С возвращением!' : 'Создать аккаунт'}
                </h1>
                <p className="text-zinc-500 text-[16px]">
                  {isLogin ? 'Мы рады видеть вас снова' : 'Присоединяйтесь к Pulse сегодня'}
                </p>
              </div>

              <form onSubmit={handleCredentialsSubmit} className="flex flex-col space-y-4">
                {!isLogin && (
                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Имя</label>
                    <div className="bg-black rounded-[20px] p-3.5 flex items-center gap-3 border border-white/5 focus-within:border-indigo-500 transition-all">
                      <input 
                        type="text" 
                        required
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="flex-1 bg-transparent text-white text-[16px] outline-none placeholder:text-zinc-700"
                        placeholder="Ваше имя"
                      />
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <div className="bg-black rounded-[20px] p-3.5 flex items-center gap-3 relative border border-white/5 focus-within:border-indigo-500 transition-all">
                    <input 
                      type="text" 
                      required
                      value={formData.username}
                      onChange={e => handleUsernameChange(e.target.value)}
                      className="flex-1 bg-transparent text-white text-[16px] outline-none placeholder:text-zinc-700"
                      placeholder="username"
                    />
                    {!isLogin && (
                      <div className="absolute right-4">
                        {usernameStatus === 'checking' && <Loader2 size={16} className="text-zinc-500 animate-spin" />}
                        {usernameStatus === 'available' && <CheckCircle2 size={16} className="text-emerald-500" />}
                        {usernameStatus === 'taken' && <XCircle size={16} className="text-red-500" />}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
                    Пароль <span className="text-red-500">*</span>
                  </label>
                  <div className="bg-black rounded-[20px] p-3.5 flex items-center gap-3 border border-white/5 focus-within:border-indigo-500 transition-all">
                    <input 
                      type="password" 
                      required
                      value={formData.password}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                      className="flex-1 bg-transparent text-white text-[16px] outline-none placeholder:text-zinc-700"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {error && <p className="text-red-500 text-[14px] mt-2 text-center">{error}</p>}

                <motion.button 
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={!isLogin && usernameStatus === 'taken'}
                  className="w-full py-4 mt-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[20px] font-bold text-[16px] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
                >
                  Продолжить
                </motion.button>

                <div className="mt-4 text-center">
                  <button 
                    type="button"
                    onClick={() => { setIsLogin(!isLogin); setError(''); }}
                    className="text-indigo-400 hover:text-indigo-300 text-[14px] font-medium transition-colors"
                  >
                    {isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
                  </button>
                </div>
              </form>
            </motion.div>
          ) : (
            <motion.div 
              key="2fa"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col"
            >
              <div className="text-center mb-6">
                <h1 className="text-[24px] font-bold text-white mb-2">2FA Подтверждение</h1>
                <p className="text-zinc-500 text-[16px]">
                  Введите 6-значный код из приложения
                </p>
              </div>

              <form onSubmit={handle2FASubmit} className="flex flex-col space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Код</label>
                  <div className="bg-black rounded-[20px] p-4 flex items-center justify-center border border-white/5 focus-within:border-indigo-500 transition-all">
                    <input 
                      type="text" 
                      required
                      maxLength={6}
                      value={formData.twoFactorCode}
                      onChange={e => setFormData({...formData, twoFactorCode: e.target.value.replace(/\D/g, '')})}
                      placeholder="000 000" 
                      className="bg-transparent text-white text-[28px] tracking-[0.3em] text-center outline-none placeholder:text-zinc-800 font-bold"
                    />
                  </div>
                </div>

                {error && <p className="text-red-500 text-[14px] text-center">{error}</p>}

                <motion.button 
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading || formData.twoFactorCode.length < 6}
                  className="w-full py-4 mt-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[20px] font-bold text-[16px] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : 'Подтвердить'}
                </motion.button>

                <button 
                  type="button"
                  onClick={() => setStep('credentials')}
                  className="w-full py-2 mt-2 text-zinc-500 hover:text-white transition-colors text-[14px] font-medium"
                >
                  Вернуться назад
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
