
import React from 'react';
import { Clock, LogOut, ShieldAlert, Phone } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const PendingApproval = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4 font-sans">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-8 text-center relative overflow-hidden animate-in fade-in zoom-in-95">
        <div className="absolute top-0 left-0 w-full h-2 bg-amber-500"></div>
        
        <div className="w-20 h-20 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
          <Clock className="w-10 h-10 animate-pulse" />
        </div>

        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Pending Approval</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6 leading-relaxed text-sm">
          Your email is verified, but your account is awaiting authorization from a Manager.
          <br/><br/>
          Role Requested: <span className="font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{user?.role}</span>
        </p>

        <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl text-xs text-slate-500 dark:text-slate-400 mb-6 text-left border border-slate-100 dark:border-slate-600">
            <p className="font-bold uppercase mb-2 flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <ShieldAlert className="w-3 h-3" /> Next Steps
            </p>
            <ul className="space-y-2 list-disc pl-4">
                <li>Contact your Line Manager or Scheduling Admin.</li>
                <li>Once approved, you will be issued an <strong>Employee ID</strong> and <strong>PIN</strong>.</li>
                <li>You will then be able to access ePRF and Rota systems.</li>
            </ul>
        </div>

        <button 
            onClick={logout}
            className="w-full py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2 text-sm"
        >
            <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  );
};

export default PendingApproval;
