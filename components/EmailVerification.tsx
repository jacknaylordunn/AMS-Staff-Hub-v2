
import React, { useState, useEffect } from 'react';
import { Mail, RefreshCw, LogOut, Send, AlertCircle, CheckCircle, Loader2, ArrowRight } from 'lucide-react';
import { auth } from '../services/firebase';
import { sendEmailVerification } from 'firebase/auth';
import { useAuth, getFriendlyErrorMessage } from '../hooks/useAuth';

const EmailVerification = () => {
  const { user, logout, refreshUser } = useAuth();
  const [isSending, setIsSending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer: any;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown(c => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (!auth.currentUser) return;
    setIsSending(true);
    setMessage('');
    setError('');
    
    try {
      await sendEmailVerification(auth.currentUser);
      setMessage('Verification email sent! Please check your inbox and spam folder.');
      setCooldown(60); // 60s cooldown to prevent API limits
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/too-many-requests') {
          setCooldown(60);
          setError('Too many requests. Please wait 60 seconds before trying again.');
      } else {
          setError(getFriendlyErrorMessage(err));
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleCheckStatus = async () => {
      setIsChecking(true);
      setError('');
      try {
          await refreshUser();
          // The auth state update triggered by refreshUser will cause the 
          // surrounding ProtectedRoute to re-evaluate. If emailVerified is true,
          // this component will unmount and the user proceeds.
          
          // If we are still here, it means it's not verified yet
          if (!auth.currentUser?.emailVerified) {
              setError('Email not yet verified. Please click the link in your email first.');
          }
      } catch (err) {
          console.error(err);
          setError('Could not refresh status. Please try again.');
      } finally {
          setIsChecking(false);
      }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4 font-sans">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-8 text-center relative overflow-hidden animate-in fade-in zoom-in-95">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-ams-blue to-ams-light-blue"></div>
        
        <div className="absolute top-4 right-4 bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 text-[10px] font-bold px-2.5 py-1 rounded-full border border-blue-100 dark:border-blue-800">
            Stage 1 of 2: Verification
        </div>

        <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 text-ams-blue dark:text-ams-light-blue rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner mt-4">
          <Mail className="w-10 h-10" />
        </div>

        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Verify Your Email</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6 leading-relaxed text-sm">
          Hi <span className="font-bold text-slate-700 dark:text-slate-300">{user?.name}</span>, before you can be approved by a manager, we need to confirm your email address.
          <br/><br/>
          We've sent a secure link to:<br/>
          <span className="font-mono bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-ams-blue dark:text-blue-400 font-bold mt-2 inline-block break-all">{user?.email}</span>
          <br/><br/>
          <span className="text-xs text-slate-400 italic">Click the link in the email, then click below.</span>
        </p>

        {message && (
            <div className="mb-6 p-3 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 animate-in slide-in-from-top-2">
                <Send className="w-3 h-3" /> {message}
            </div>
        )}

        {error && (
            <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 animate-in slide-in-from-top-2">
                <AlertCircle className="w-3 h-3" /> {error}
            </div>
        )}

        <div className="space-y-3">
            <button 
                onClick={handleCheckStatus}
                disabled={isChecking}
                className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 active:scale-95"
            >
                {isChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {isChecking ? 'Checking...' : 'I\'ve Verified - Continue'}
            </button>

            <button 
                onClick={handleResend}
                disabled={isSending || cooldown > 0}
                className={`w-full py-3 border rounded-xl font-bold transition-colors text-sm flex items-center justify-center gap-2
                    ${isSending || cooldown > 0 
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed' 
                        : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
                    }`}
            >
                {isSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {isSending ? 'Sending...' : cooldown > 0 ? `Wait ${cooldown}s to Resend` : 'Resend Verification Email'}
            </button>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 mt-4">
                <button 
                    onClick={logout}
                    className="w-full py-2 text-slate-400 dark:text-slate-500 font-bold text-xs hover:text-red-500 transition-colors flex items-center justify-center gap-1"
                >
                    <LogOut className="w-3 h-3" /> Sign Out
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;
