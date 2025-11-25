
import React, { useState } from 'react';
import { Mail, RefreshCw, LogOut, Send, AlertCircle } from 'lucide-react';
import { auth } from '../services/firebase';
import { sendEmailVerification } from 'firebase/auth';
import { useAuth, getFriendlyErrorMessage } from '../hooks/useAuth';

const EmailVerification = () => {
  const { user, logout } = useAuth();
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleResend = async () => {
    if (!auth.currentUser) return;
    setIsSending(true);
    setMessage('');
    setError('');
    
    try {
      await sendEmailVerification(auth.currentUser);
      setMessage('Verification email sent! Please check your inbox and spam folder.');
    } catch (err: any) {
      console.error(err);
      setError(getFriendlyErrorMessage(err));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4 font-sans">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-8 text-center relative overflow-hidden animate-in fade-in zoom-in-95">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-ams-blue to-ams-light-blue"></div>
        
        <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 text-ams-blue dark:text-ams-light-blue rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
          <Mail className="w-10 h-10" />
        </div>

        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Verify Your Email</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6 leading-relaxed text-sm">
          Hi <span className="font-bold text-slate-700 dark:text-slate-300">{user?.name}</span>, to ensure the security of clinical data, we need to verify your identity.
          <br/><br/>
          We've sent a link to:<br/>
          <span className="font-mono bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-ams-blue dark:text-blue-400 font-bold mt-2 inline-block break-all">{user?.email}</span>
        </p>

        {message && (
            <div className="mb-6 p-3 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                <Send className="w-3 h-3" /> {message}
            </div>
        )}

        {error && (
            <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                <AlertCircle className="w-3 h-3" /> {error}
            </div>
        )}

        <div className="space-y-3">
            <button 
                onClick={handleResend}
                disabled={isSending}
                className="w-full py-3 bg-ams-blue hover:bg-blue-900 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 active:scale-95"
            >
                {isSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {isSending ? 'Sending...' : 'Resend Verification Email'}
            </button>
            
            <button 
                onClick={() => window.location.reload()}
                className="w-full py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors text-sm"
            >
                I've Verified, Refresh Page
            </button>

            <button 
                onClick={logout}
                className="w-full py-2 text-slate-400 dark:text-slate-500 font-bold text-xs hover:text-red-500 transition-colors flex items-center justify-center gap-1"
            >
                <LogOut className="w-3 h-3" /> Sign Out
            </button>
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;
