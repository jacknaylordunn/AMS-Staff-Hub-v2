
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LogIn, ShieldCheck, AlertCircle, Hash, Mail, Loader2, ArrowRight } from 'lucide-react';
import { Role } from '../types';

const AMS_LOGO = "https://145955222.fs1.hubspotusercontent-eu1.net/hubfs/145955222/AMS/Logo%20FINAL%20(2).png";

const LoginPage = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'Email' | 'Badge'>('Email');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Badge Login State
  const [badgeNumber, setBadgeNumber] = useState(''); // Only numbers part

  // Registration specific state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [localError, setLocalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, loginWithBadge, register, error: authError, user, isLoading, firebaseUser } = useAuth();
  const navigate = useNavigate();

  // Auto-redirect if logged in
  useEffect(() => {
      if (!isLoading && firebaseUser) {
          navigate('/');
      }
  }, [firebaseUser, isLoading, navigate]);

  // Password Validation Regex
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setIsSubmitting(true);
    
    try {
        if (isRegistering) {
            if (!passwordRegex.test(password)) {
                setLocalError("Password must be at least 6 characters and contain: Uppercase, Lowercase, Number, and Special Character.");
                setIsSubmitting(false);
                return;
            }
            await register(email, password, `${firstName} ${lastName}`, Role.Pending, regNumber);
        } else {
            if (loginMethod === 'Email') {
                await login(email, password);
            } else {
                // Construct full badge ID
                const fullBadgeId = `AMS${badgeNumber}`;
                await loginWithBadge(fullBadgeId, password);
            }
        }
    } catch (err: any) {
        setLocalError(err.message || "Authentication failed");
        setIsSubmitting(false);
    }
  };

  const PasswordRequirements = () => (
      <div className="text-[10px] text-slate-400 mt-2 p-2 bg-black/20 rounded space-y-1 border border-white/5">
          <p className="font-bold uppercase text-slate-500">Password Requirements:</p>
          <div className="grid grid-cols-2 gap-1">
              <span className={password.length >= 6 ? "text-green-400 font-bold" : ""}>• 6+ Characters</span>
              <span className={/[A-Z]/.test(password) ? "text-green-400 font-bold" : ""}>• Uppercase</span>
              <span className={/[a-z]/.test(password) ? "text-green-400 font-bold" : ""}>• Lowercase</span>
              <span className={/[0-9]/.test(password) ? "text-green-400 font-bold" : ""}>• Number</span>
              <span className={/[@$!%*?&]/.test(password) ? "text-green-400 font-bold" : ""}>• Special Char</span>
          </div>
      </div>
  );

  if (isLoading) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-[#0F172A]">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
      );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] relative overflow-hidden font-sans selection:bg-ams-blue selection:text-white p-4">
      {/* Abstract Background Shapes */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-blob"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-32 left-20 w-96 h-96 bg-indigo-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-blob animation-delay-4000"></div>

      <div className="relative z-10 w-full max-w-md p-8 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl animate-in fade-in zoom-in duration-300 ring-1 ring-white/5">
        
        <div className="flex flex-col items-center mb-8">
          <div className="w-32 h-32 bg-white/90 rounded-3xl flex items-center justify-center mb-6 shadow-glow p-4 backdrop-blur-sm hover:scale-105 transition-transform duration-300">
            <img 
                src={AMS_LOGO} 
                alt="Aegis Logo" 
                className="w-full h-full object-contain" 
            />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight text-center">Aegis Staff Hub</h1>
          <p className="text-slate-400 mt-2 text-sm font-medium uppercase tracking-widest border-b border-slate-700 pb-1">Clinical Operations Platform</p>
        </div>

        {(localError || authError) && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-200 text-sm shadow-inner animate-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400 mt-0.5" />
                <span>{localError || authError}</span>
            </div>
        )}

        {/* Login Method Toggle */}
        {!isRegistering && (
            <div className="flex bg-slate-950/50 p-1.5 rounded-xl mb-6 border border-white/5">
                <button 
                    type="button"
                    onClick={() => setLoginMethod('Email')}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all duration-300 ${loginMethod === 'Email' ? 'bg-ams-blue text-white shadow-md ring-1 ring-white/10' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <Mail className="w-3.5 h-3.5" /> Email Login
                </button>
                <button 
                    type="button"
                    onClick={() => setLoginMethod('Badge')}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all duration-300 ${loginMethod === 'Badge' ? 'bg-ams-blue text-white shadow-md ring-1 ring-white/10' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <Hash className="w-3.5 h-3.5" /> Badge Login
                </button>
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {isRegistering && (
            <div className="space-y-4 animate-in slide-in-from-right-8 fade-in duration-300">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase ml-1">First Name</label>
                        <input
                            type="text"
                            required
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="input-field"
                            placeholder="John"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase ml-1">Last Name</label>
                        <input
                            type="text"
                            required
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className="input-field"
                            placeholder="Doe"
                        />
                    </div>
                </div>
                
                <div className="animate-in fade-in slide-in-from-top-2">
                    <label className="block text-xs font-bold text-blue-400 mb-1.5 uppercase ml-1 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Registration Number (Optional)
                    </label>
                    <input
                        type="text"
                        value={regNumber}
                        onChange={(e) => setRegNumber(e.target.value)}
                        className="input-field border-blue-500/30 focus:border-blue-500 bg-blue-900/10"
                        placeholder="HCPC / NMC / PIN"
                    />
                </div>
            </div>
          )}

          {!isRegistering && loginMethod === 'Badge' ? (
              <div className="animate-in fade-in">
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase ml-1">Employee Badge ID</label>
                <div className="relative flex items-center group">
                    <div className="absolute left-0 top-0 bottom-0 w-16 bg-slate-800 border border-slate-600 rounded-l-xl flex items-center justify-center text-slate-400 font-mono font-bold text-sm z-10 pointer-events-none">
                        AMS
                    </div>
                    <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        required
                        value={badgeNumber}
                        onChange={(e) => setBadgeNumber(e.target.value.replace(/\D/g, '').slice(0, 8))} // Limit to 8 digits
                        className="input-field !pl-20 font-mono tracking-widest"
                        placeholder="YYMMXXXX"
                        maxLength={8}
                    />
                </div>
                <p className="text-[10px] text-slate-500 mt-1 ml-1">Format: YYMM + 4 Digits (e.g. 25031234)</p>
              </div>
          ) : (
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase ml-1">Email Address</label>
                <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field"
                    placeholder="name@aegismedicalsolutions.co.uk"
                />
              </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase ml-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
            />
            {isRegistering && <PasswordRequirements />}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 px-6 bg-ams-blue hover:bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 text-sm tracking-wide flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
                <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isRegistering ? 'Creating Account...' : 'Signing In...'}
                </>
            ) : (
                <>{isRegistering ? 'Create Staff Account' : loginMethod === 'Badge' ? 'Authenticate with Badge' : 'Sign In to Hub'} <ArrowRight className="w-4 h-4 opacity-50" /></>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <button 
            onClick={() => {
                setIsRegistering(!isRegistering);
                setLocalError('');
                setLoginMethod('Email');
            }}
            className="group flex items-center justify-center gap-2 mx-auto text-slate-400 hover:text-white transition-colors text-sm font-medium"
          >
            {isRegistering ? (
                <><LogIn className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Return to Login</>
            ) : (
                <>No account? <span className="text-white font-bold group-hover:underline">Register new staff access</span></>
            )}
          </button>
        </div>
      </div>
      
      <style>{`
        .input-field {
            width: 100%;
            padding: 0.875rem 1rem;
            background-color: rgba(15, 23, 42, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 0.75rem;
            color: white;
            transition: all 0.2s;
            outline: none;
            font-size: 0.95rem;
        }
        .input-field:focus {
            border-color: #0052CC;
            background-color: rgba(15, 23, 42, 0.9);
            box-shadow: 0 0 0 2px rgba(0, 82, 204, 0.25);
        }
        .input-field::placeholder {
            color: rgba(148, 163, 184, 0.5);
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
