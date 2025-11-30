
import React, { useState } from 'react';
import { Key, Lock, CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const PinSetup = () => {
  const { user, updatePin } = useAuth();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (pin.length !== 4 || !/^\d+$/.test(pin)) {
        setError('PIN must be exactly 4 digits.');
        return;
    }
    
    if (pin !== confirmPin) {
        setError('PINs do not match.');
        return;
    }

    setIsSubmitting(true);
    try {
        await updatePin(pin);
        // The AuthContext or ProtectedRoute should automatically detect the change 
        // (pin exists) and unmount this component.
    } catch (err) {
        console.error(err);
        setError('Failed to save PIN. Please try again.');
        setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4 font-sans">
      <div className="max-w-sm w-full bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-8 text-center relative overflow-hidden animate-in fade-in zoom-in-95">
        <div className="absolute top-0 left-0 w-full h-2 bg-ams-blue"></div>
        
        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-ams-blue dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
          <Key className="w-8 h-8" />
        </div>

        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Set Your Digital PIN</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm leading-relaxed">
          Welcome, {user?.name.split(' ')[0]}.<br/>
          Before you start, please set a secure 4-digit PIN. You will use this to sign ePRFs and witness drugs.
        </p>

        {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                <Lock className="w-3 h-3" /> {error}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <input 
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    placeholder="Create 4-Digit PIN"
                    className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-center text-lg font-bold tracking-widest outline-none focus:ring-2 focus:ring-ams-blue dark:text-white transition-all placeholder:text-sm placeholder:font-normal placeholder:tracking-normal"
                    value={pin}
                    onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                    autoFocus
                />
            </div>
            <div>
                <input 
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    placeholder="Confirm PIN"
                    className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-center text-lg font-bold tracking-widest outline-none focus:ring-2 focus:ring-ams-blue dark:text-white transition-all placeholder:text-sm placeholder:font-normal placeholder:tracking-normal"
                    value={confirmPin}
                    onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                />
            </div>

            <button 
                type="submit"
                disabled={isSubmitting || pin.length !== 4}
                className="w-full py-3 bg-ams-blue hover:bg-blue-900 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
            >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Save Secure PIN
            </button>
        </form>
      </div>
    </div>
  );
};

export default PinSetup;
