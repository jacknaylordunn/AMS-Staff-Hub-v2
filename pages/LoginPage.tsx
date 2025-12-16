
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LogIn, Hash, Mail, Loader2, ArrowRight, UserPlus, Shield, Check, X, KeyRound, ArrowLeft } from 'lucide-react';
import { Role } from '../types';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../services/firebase';

// Use hosted company asset path
const logo = 'https://145955222.fs1.hubspotusercontent-eu1.net/hubfs/145955222/AMS/Logo%20FINAL%20(2).png';

const LoginPage = () => {
  const [mode, setMode] = useState<'Login' | 'Register' | 'Reset'>('Login');
  const [loginMethod, setLoginMethod] = useState<'Email' | 'Badge'>('Email');
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [badgeNumber, setBadgeNumber] = useState('');
  
  // Registration State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [regNumber, setRegNumber] = useState('');
  
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, loginWithBadge, register } = useAuth();
  const navigate = useNavigate();

  // Password Validation Logic
  const passwordRequirements = [
      { id: 'len', label: 'Min 6 chars', valid: password.length >= 6 },
      { id: 'upper', label: 'Uppercase', valid: /[A-Z]/.test(password) },
      { id: 'lower', label: 'Lowercase', valid: /[a-z]/.test(password) },
      { id: 'num', label: 'Number', valid: /[0-9]/.test(password) },
      { id: 'special', label: 'Special char', valid: /[^A-Za-z0-9]/.test(password) },
  ];

  const allRequirementsMet = passwordRequirements.every(r => r.valid);

  const handlePasswordReset = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setSuccessMsg('');
      if (!email) {
          setError("Please enter your email address.");
          return;
      }
      setIsSubmitting(true);
      try {
          await sendPasswordResetEmail(auth, email);
          setSuccessMsg("Password reset email sent! Check your inbox.");
          setTimeout(() => {
              setMode('Login');
              setSuccessMsg('');
          }, 3000);
      } catch (err: any) {
          console.error(err);
          if (err.code === 'auth/user-not-found') {
              setError("No account found with this email.");
          } else {
              setError("Failed to send reset email. Please try again.");
          }
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    try {
        if (mode === 'Login') {
            if (loginMethod === 'Email') {
                await login(email, password);
            } else {
                const cleanNumber = badgeNumber.replace(/\D/g, '');
                if (!cleanNumber) throw new Error("Please enter your badge number.");
                const fullBadgeId = `AMS${cleanNumber}`;
                await loginWithBadge(fullBadgeId, password);
            }
            navigate('/');
        } else if (mode === 'Register') {
            if (!firstName || !lastName || !email || !password) throw new Error("Please fill in all required fields.");
            if (!allRequirementsMet) throw new Error("Password does not meet security requirements.");
            
            const fullName = `${firstName.trim()} ${lastName.trim()}`;
            await register(email, password, fullName, Role.Pending, regNumber);
        }
    } catch (err: any) {
        setError(err.message || "Authentication failed");
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0F1115] relative overflow-hidden p-4">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-ams-blue/20 to-transparent dark:from-ams-blue/10 pointer-events-none"></div>
      <div className="absolute -top-20 -right-20 w-96 h-96 bg-ams-blue/20 rounded-full blur-3xl opacity-50 pointer-events-none animate-blob"></div>
      <div className="absolute top-40 -left-20 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl opacity-50 pointer-events-none animate-blob animation-delay-2000"></div>

      <div className="w-full max-w-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 dark:border-white/10 p-8 relative z-10 animate-fade-in">
        
        <div className="flex flex-col items-center mb-8">
            <img 
                src={logo} 
                alt="Aegis Logo" 
                className="h-20 w-auto object-contain mb-4 drop-shadow-md"
                onError={(e) => e.currentTarget.style.display = 'none'}
            />
            <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">Aegis Staff Hub</h1>
        </div>

        {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl text-red-600 dark:text-red-300 text-xs font-bold text-center flex items-center justify-center gap-2">
               <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span> {error}
            </div>
        )}

        {successMsg && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30 rounded-xl text-green-600 dark:text-green-300 text-xs font-bold text-center flex items-center justify-center gap-2">
               <Check className="w-4 h-4" /> {successMsg}
            </div>
        )}

        {mode === 'Reset' ? (
            <form onSubmit={handlePasswordReset} className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <div className="text-center mb-4">
                    <h3 className="font-bold text-slate-800 dark:text-white">Reset Password</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Enter your email to receive a reset link.</p>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Email Address</label>
                    <div className="relative">
                        <Mail className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-ams-blue/50 focus:border-ams-blue transition-all" placeholder="name@aegis.co.uk" required />
                    </div>
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-ams-blue hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed mt-4">
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (<>Send Reset Link <ArrowRight className="w-4 h-4" /></>)}
                </button>
                <button type="button" onClick={() => { setMode('Login'); setError(''); setSuccessMsg(''); }} className="w-full py-3 text-slate-500 dark:text-slate-400 font-bold text-xs hover:text-slate-800 dark:hover:text-white transition-colors flex items-center justify-center gap-2">
                    <ArrowLeft className="w-3 h-3" /> Back to Login
                </button>
            </form>
        ) : (
            <>
                {mode === 'Login' && (
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl mb-6">
                        <button 
                            onClick={() => setLoginMethod('Email')} 
                            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${loginMethod === 'Email' ? 'bg-white dark:bg-slate-700 text-ams-blue dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            <Mail className="w-3 h-3" /> Email Login
                        </button>
                        <button 
                            onClick={() => setLoginMethod('Badge')} 
                            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${loginMethod === 'Badge' ? 'bg-white dark:bg-slate-700 text-ams-blue dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            <Hash className="w-3 h-3" /> Badge ID
                        </button>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    
                    {mode === 'Register' && (
                        <div className="space-y-4 animate-in slide-in-from-right-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">First Name</label>
                                    <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-ams-blue/50 focus:border-ams-blue transition-all" placeholder="John" required />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Last Name</label>
                                    <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-ams-blue/50 focus:border-ams-blue transition-all" placeholder="Doe" required />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Professional Reg (Optional)</label>
                                <div className="relative">
                                    <Shield className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                                    <input type="text" value={regNumber} onChange={e => setRegNumber(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-ams-blue/50 focus:border-ams-blue transition-all" placeholder="HCPC / NMC / PIN" />
                                </div>
                            </div>
                        </div>
                    )}

                    {(mode === 'Register' || loginMethod === 'Email') ? (
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-ams-blue/50 focus:border-ams-blue transition-all" placeholder="name@aegis.co.uk" required />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Badge Number</label>
                            <div className="relative flex items-center">
                                <div className="absolute left-0 top-0 bottom-0 w-14 bg-slate-100 dark:bg-slate-800 rounded-l-xl flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold text-xs border-r border-slate-200 dark:border-slate-700">AMS</div>
                                <input type="text" inputMode="numeric" value={badgeNumber} onChange={e => setBadgeNumber(e.target.value)} className="w-full pl-16 pr-4 py-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-ams-blue/50 focus:border-ams-blue transition-all font-mono" placeholder="12345678" />
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Password</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-ams-blue/50 focus:border-ams-blue transition-all" placeholder="••••••••" required />
                        
                        {mode === 'Login' && (
                            <div className="flex justify-end">
                                <button type="button" onClick={() => { setMode('Reset'); setError(''); }} className="text-[10px] font-bold text-ams-blue hover:underline">
                                    Forgot Password?
                                </button>
                            </div>
                        )}

                        {mode === 'Register' && (
                            <div className="grid grid-cols-2 gap-2 mt-2 px-1">
                                {passwordRequirements.map(req => (
                                    <div key={req.id} className={`text-[10px] font-bold flex items-center gap-1.5 ${req.valid ? 'text-green-500' : 'text-slate-400'}`}>
                                        {req.valid ? <Check className="w-3 h-3" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>}
                                        {req.label}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-ams-blue hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed mt-4">
                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (<>{mode === 'Login' ? 'Sign In' : 'Create Account'} <ArrowRight className="w-4 h-4" /></>)}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/5 text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                        {mode === 'Login' ? "New staff member?" : "Already have an account?"}
                        <button onClick={() => { setMode(mode === 'Login' ? 'Register' : 'Login'); setError(''); setSuccessMsg(''); }} className="text-ams-blue font-bold hover:underline ml-1">
                            {mode === 'Login' ? "Register" : "Sign in"}
                        </button>
                    </p>
                    <div className="text-[10px] text-slate-400 leading-tight">© 2025 Aegis Medical Solutions.</div>
                </div>
            </>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
