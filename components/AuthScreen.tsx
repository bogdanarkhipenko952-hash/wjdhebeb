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
    <div className="h-full w-full bg-[#121212] flex flex-col items-center p-4 relative font-sans overflow-y-auto">
      {/* Background Gradient */}
      <div className="absolute top-0 left-0 right-0 h-[50vh] bg-gradient-to-b from-indigo-600/20 via-purple-900/10 to-transparent pointer-events-none" />
      
      {/* Header */}
      <div className="w-full max-w-md flex justify-between items-center pt-8 pb-12 relative z-10">
        <div className="w-8" /> {/* Spacer for centering */}
        <div className="flex items-center gap-2">
          <Zap size={28} className="text-indigo-500 fill-indigo-500" />
          <span className="text-2xl font-bold text-white tracking-wide">Plus messenger</span>
        </div>
        <button className="text-zinc-400 hover:text-white transition-colors">
          <HelpCircle size={24} />
        </button>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10 flex flex-col flex-1"
      >
        <AnimatePresence mode="wait">
          {step === 'credentials' ? (
            <motion.div 
              key="credentials"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex flex-col flex-1"
            >
              <div className="text-center mb-8">
                <h1 className="text-[26px] leading-tight font-bold text-white mb-3">
                  {isLogin ? 'Вход в аккаунт' : 'Регистрация'}
                </h1>
                <p className="text-zinc-400 text-[15px]">
                  Введите имя пользователя и пароль
                </p>
              </div>

              <div className="flex bg-[#3a3a3c] p-1 rounded-2xl mb-8">
                <button 
                  onClick={() => { setIsLogin(true); setError(''); }}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${isLogin ? 'bg-zinc-700 text-white shadow-lg' : 'text-zinc-400 hover:text-zinc-200'}`}
                >
                  Вход
                </button>
                <button 
                  onClick={() => { setIsLogin(false); setError(''); }}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${!isLogin ? 'bg-zinc-700 text-white shadow-lg' : 'text-zinc-400 hover:text-zinc-200'}`}
                >
                  Регистрация
                </button>
              </div>

              <form onSubmit={handleCredentialsSubmit} className="flex-1 flex flex-col space-y-4">
                {!isLogin && (
                  <div className="bg-[#3a3a3c] rounded-2xl p-4 flex items-center gap-3">
                    <User className="text-zinc-400" size={20} />
                    <input 
                      type="text" 
                      required
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder="Ваше имя" 
                      className="flex-1 bg-transparent text-white text-lg outline-none placeholder:text-zinc-500"
                    />
                  </div>
                )}

                <div className="bg-[#3a3a3c] rounded-2xl p-4 flex items-center gap-3 relative">
                  <AtSign className="text-zinc-400" size={20} />
                  <input 
                    type="text" 
                    required
                    value={formData.username}
                    onChange={e => handleUsernameChange(e.target.value)}
                    placeholder="username" 
                    className="flex-1 bg-transparent text-white text-lg outline-none placeholder:text-zinc-500 font-mono"
                  />
                  {!isLogin && (
                    <div className="absolute right-4">
                      {usernameStatus === 'checking' && <Loader2 size={18} className="text-zinc-500 animate-spin" />}
                      {usernameStatus === 'available' && <CheckCircle2 size={18} className="text-emerald-500" />}
                      {usernameStatus === 'taken' && <XCircle size={18} className="text-red-500" />}
                    </div>
                  )}
                </div>

                <div className="bg-[#3a3a3c] rounded-2xl p-4 flex items-center gap-3">
                  <Lock className="text-zinc-400" size={20} />
                  <input 
                    type="password" 
                    required
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    placeholder="Пароль" 
                    className="flex-1 bg-transparent text-white text-lg outline-none placeholder:text-zinc-500"
                  />
                </div>

                {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                <div className="mt-auto pt-8 pb-4">
                  <button 
                    type="submit"
                    disabled={formData.username.length < 1 || formData.password.length < 1 || (!isLogin && (!formData.name || usernameStatus !== 'available'))}
                    className="w-full py-4 rounded-[20px] font-bold text-[17px] transition-all disabled:bg-[#3a3a3c] disabled:text-zinc-500 bg-white text-black hover:bg-zinc-200"
                  >
                    Продолжить
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
              className="flex flex-col flex-1"
            >
              <div className="text-center mb-8">
                <h1 className="text-[26px] leading-tight font-bold text-white mb-3">Второй пароль</h1>
                <p className="text-zinc-400 text-[15px]">
                  {isLogin ? 'Введите ваш второй пароль для входа' : 'Придумайте второй пароль для защиты аккаунта'}
                </p>
              </div>

              <form onSubmit={handle2FASubmit} className="flex-1 flex flex-col">
                <div className="bg-[#3a3a3c] rounded-2xl p-4 mb-4 flex items-center gap-3">
                  <Lock className="text-zinc-400" size={20} />
                  <input 
                    type="password" 
                    required
                    value={formData.twoFactorCode}
                    onChange={e => setFormData({...formData, twoFactorCode: e.target.value})}
                    placeholder="Второй пароль" 
                    className="w-full bg-transparent text-white text-lg outline-none placeholder:text-zinc-500"
                    autoFocus
                  />
                </div>
                
                {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}

                <div className="mt-auto pt-8 pb-4">
                  <button 
                    type="submit"
                    disabled={formData.twoFactorCode.length < 4 || loading}
                    className="w-full py-4 rounded-[20px] font-bold text-[17px] transition-all disabled:bg-[#3a3a3c] disabled:text-zinc-500 bg-white text-black hover:bg-zinc-200 flex justify-center items-center"
                  >
                    {loading ? 'Загрузка...' : (isLogin ? 'Войти' : 'Завершить регистрацию')}
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setStep('credentials'); setError(''); }}
                    className="w-full py-4 mt-2 rounded-[20px] font-bold text-[15px] text-zinc-400 hover:text-white transition-colors"
                  >
                    Назад
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
