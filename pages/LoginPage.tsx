
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LogIn, Hash, Mail, Loader2, ArrowRight, UserPlus, Shield, Check, X } from 'lucide-react';
import { Role } from '../types';

const LoginPage = () => {
  const [mode, setMode] = useState<'Login' | 'Register'>('Login');
  const [loginMethod, setLoginMethod] = useState<'Email' | 'Badge'>('Email');
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [badgeNumber, setBadgeNumber] = useState('');
  
  // Registration State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  // Role is strictly Pending for new registrations
  const [regNumber, setRegNumber] = useState('');
  
  const [error, setError] = useState('');
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
                // Basic check to ensure user entered something
                if (!cleanNumber) throw new Error("Please enter your badge number.");
                const fullBadgeId = `AMS${cleanNumber}`;
                await loginWithBadge(fullBadgeId, password);
            }
            navigate('/');
        } else {
            // Registration Logic
            if (!firstName || !lastName || !email || !password) throw new Error("Please fill in all required fields.");
            
            if (!allRequirementsMet) {
                throw new Error("Password does not meet security requirements.");
            }
            
            const fullName = `${firstName.trim()} ${lastName.trim()}`;
            // Always register as Pending
            await register(email, password, fullName, Role.Pending, regNumber);
            // Auth listener in App.tsx/ProtectedRoute will handle the redirect/verification state
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
                src="https://145955222.fs1.hubspotusercontent-eu1.net/hubfs/145955222/AMS/Logo%20FINAL%20(2).png" 
                alt="Aegis Logo" 
                className="h-20 w-auto object-contain mb-4 drop-shadow-md"
            />
            <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">Aegis Staff Hub</h1>
        </div>

        {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl text-red-600 dark:text-red-300 text-xs font-bold text-center flex items-center justify-center gap-2">
               <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span> {error}
            </div>
        )}

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
                            <input 
                                type="text" 
                                value={firstName} 
                                onChange={e => setFirstName(e.target.value)} 
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-ams-blue/50 focus:border-ams-blue transition-all" 
                                placeholder="John" 
                                required 
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Last Name</label>
                            <input 
                                type="text" 
                                value={lastName} 
                                onChange={e => setLastName(e.target.value)} 
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-ams-blue/50 focus:border-ams-blue transition-all" 
                                placeholder="Doe" 
                                required 
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Professional Reg (Optional)</label>
                        <div className="relative">
                            <Shield className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                            <input 
                                type="text" 
                                value={regNumber} 
                                onChange={e => setRegNumber(e.target.value)} 
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-ams-blue/50 focus:border-ams-blue transition-all" 
                                placeholder="HCPC / NMC / PIN" 
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Common Fields */}
            {(mode === 'Register' || loginMethod === 'Email') ? (
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Email Address</label>
                    <div className="relative">
                        <Mail className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                        <input 
                            type="email" 
                            value={email} 
                            onChange={e => setEmail(e.target.value)} 
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-ams-blue/50 focus:border-ams-blue transition-all" 
                            placeholder="name@aegis.co.uk" 
                            required 
                        />
                    </div>
                </div>
            ) : (
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Badge Number</label>
                    <div className="relative flex items-center">
                        <div className="absolute left-0 top-0 bottom-0 w-14 bg-slate-100 dark:bg-slate-800 rounded-l-xl flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold text-xs border-r border-slate-200 dark:border-slate-700">AMS</div>
                        <input 
                            type="text" 
                            inputMode="numeric" 
                            value={badgeNumber} 
                            onChange={e => setBadgeNumber(e.target.value)} 
                            className="w-full pl-16 pr-4 py-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono tracking-widest text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-ams-blue/50 focus:border-ams-blue transition-all" 
                            placeholder="12345678" 
                            required 
                        />
                    </div>
                </div>
            )}
            
            <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Password</label>
                <div className="relative">
                    <LogIn className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                    <input 
                        type="password" 
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-ams-blue/50 focus:border-ams-blue transition-all" 
                        placeholder="••••••••" 
                        required 
                    />
                </div>
                
                {/* Password Requirements Checklist (Register Only) */}
                {mode === 'Register' && (
                    <div className="grid grid-cols-2 gap-2 mt-2 px-1">
                        {passwordRequirements.map((req) => (
                            <div key={req.id} className={`flex items-center gap-1.5 text-[10px] font-bold transition-colors ${req.valid ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}`}>
                                {req.valid ? <Check className="w-3 h-3" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 ml-1 mr-0.5" />}
                                {req.label}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <button 
                disabled={isSubmitting || (mode === 'Register' && !allRequirementsMet)} 
                className="w-full py-3.5 bg-gradient-to-r from-ams-blue to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
            >
                {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : (
                    mode === 'Login' ? <>Sign In <ArrowRight className="w-4 h-4" /></> : <>Register for Access <UserPlus className="w-4 h-4" /></>
                )}
            </button>
        </form>
        
        <div className="mt-6 text-center">
            {mode === 'Login' ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    New staff member?{' '}
                    <button onClick={() => setMode('Register')} className="text-ams-blue font-bold hover:underline">
                        Register for access
                    </button>
                </p>
            ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    Already registered?{' '}
                    <button onClick={() => setMode('Login')} className="text-ams-blue font-bold hover:underline">
                        Back to Login
                    </button>
                </p>
            )}
        </div>

        <p className="text-center text-[10px] text-slate-400 mt-8 border-t border-slate-100 dark:border-slate-800 pt-4">
            &copy; 2025 Aegis Medical Solutions. <br/>Unauthorized access is prohibited.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
