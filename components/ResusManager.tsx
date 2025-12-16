
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Zap, Syringe, Clock, RotateCcw, AlertTriangle, Activity, CheckSquare, Wind, HeartPulse, Pill } from 'lucide-react';
import { ResusEvent } from '../types';
import { useAuth } from '../hooks/useAuth';

interface ResusManagerProps {
    onLogEvent: (event: ResusEvent) => void;
    initialLog?: ResusEvent[];
}

const ResusManager: React.FC<ResusManagerProps> = ({ onLogEvent, initialLog = [] }) => {
    const { user } = useAuth();
    const [isActive, setIsActive] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [cycleSeconds, setCycleSeconds] = useState(0); // 2 min cycle
    const [adrenalineSeconds, setAdrenalineSeconds] = useState(0); // 3-5 min timer
    const [totalShocks, setTotalShocks] = useState(0);
    const [htList, setHtList] = useState<string[]>([]);

    const timerRef = useRef<any>(null);

    // H's and T's
    const REVERSIBLE_CAUSES = [
        'Hypoxia', 'Hypovolemia', 'Hypo/Hyperthermia', 'Hypo/Hyperkalemia', 
        'Toxins', 'Tamponade', 'Tension Pneumothorax', 'Thrombosis'
    ];

    useEffect(() => {
        if (isActive) {
            timerRef.current = setInterval(() => {
                setElapsedSeconds(prev => prev + 1);
                setCycleSeconds(prev => prev + 1);
                setAdrenalineSeconds(prev => prev + 1);
            }, 1000);
        } else if (!isActive && timerRef.current) {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [isActive]);

    const formatTime = (secs: number) => {
        const mins = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${mins}:${s}`;
    };

    const logAction = (action: string, type: ResusEvent['type']) => {
        const newEvent: ResusEvent = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            action,
            type,
            user: user?.name || 'Clinician'
        };
        onLogEvent(newEvent);
    };

    const handleShock = () => {
        setTotalShocks(prev => prev + 1);
        logAction(`Shock #${totalShocks + 1} Delivered`, 'Shock');
        setCycleSeconds(0); // Reset cycle on shock usually implies rhythm check done
    };

    const handleRhythmCheck = () => {
        setCycleSeconds(0);
        logAction('Rhythm Check Performed', 'Status');
    };

    const handleAdrenaline = () => {
        setAdrenalineSeconds(0);
        logAction('Adrenaline 1mg (1:10,000) IV/IO', 'Drug');
    };

    const handleAmiodarone = () => {
        logAction('Amiodarone 300mg IV/IO', 'Drug');
    };

    const toggleHT = (cause: string) => {
        if (htList.includes(cause)) {
            setHtList(prev => prev.filter(c => c !== cause));
        } else {
            setHtList(prev => [...prev, cause]);
            logAction(`Considered/Treated: ${cause}`, 'Other');
        }
    };

    // Cycle Progress (2 mins = 120s)
    const cycleProgress = Math.min((cycleSeconds / 120) * 100, 100);
    const cycleColor = cycleSeconds > 105 ? 'bg-red-500 animate-pulse' : 'bg-green-500';

    // Adrenaline Progress (Target 3-5 mins, say 4 mins = 240s)
    const adrenalineProgress = Math.min((adrenalineSeconds / 240) * 100, 100);
    const adrenalineColor = adrenalineSeconds >= 180 ? 'bg-green-500' : 'bg-slate-300'; // Green when ready (>3 mins)

    return (
        <div className="space-y-6">
            {/* Master Clock & Controls */}
            <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-700 relative overflow-hidden">
                <div className="flex justify-between items-center mb-6 relative z-10">
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Resuscitation Time</p>
                        <div className="text-5xl font-mono font-bold tracking-wider">{formatTime(elapsedSeconds)}</div>
                    </div>
                    <button 
                        onClick={() => setIsActive(!isActive)}
                        className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg ${isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                    >
                        {isActive ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                    </button>
                </div>

                {/* Timers Grid */}
                <div className="grid grid-cols-2 gap-4 relative z-10">
                    {/* Cycle Timer */}
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><Activity className="w-3 h-3" /> Rhythm Check</span>
                            <span className={`text-xl font-mono font-bold ${cycleSeconds > 110 ? 'text-red-500' : 'text-white'}`}>{formatTime(cycleSeconds)}</span>
                        </div>
                        <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden mb-3">
                            <div className={`h-full transition-all duration-1000 ${cycleColor}`} style={{ width: `${cycleProgress}%` }}></div>
                        </div>
                        <button onClick={handleRhythmCheck} className="w-full py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold transition-colors">
                            Log Check / Reset
                        </button>
                    </div>

                    {/* Adrenaline Timer */}
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><Syringe className="w-3 h-3" /> Adrenaline</span>
                            <span className="text-xl font-mono font-bold">{formatTime(adrenalineSeconds)}</span>
                        </div>
                        <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden mb-3">
                            <div className={`h-full transition-all duration-1000 ${adrenalineColor}`} style={{ width: `${adrenalineProgress}%` }}></div>
                        </div>
                        <button onClick={handleAdrenaline} className="w-full py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold transition-colors">
                            Log Dose / Reset
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button onClick={handleShock} className="p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-xl font-bold flex flex-col items-center gap-2 border border-red-200 dark:border-red-800 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors shadow-sm">
                    <Zap className="w-6 h-6" />
                    <span>Shock ({totalShocks})</span>
                </button>
                <button onClick={handleAmiodarone} className="p-4 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-xl font-bold flex flex-col items-center gap-2 border border-purple-200 dark:border-purple-800 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors shadow-sm">
                    <Pill className="w-6 h-6" />
                    <span>Amiodarone</span>
                </button>
                <button onClick={() => logAction('iGel Inserted', 'Airway')} className="p-4 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-xl font-bold flex flex-col items-center gap-2 border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors shadow-sm">
                    <Wind className="w-6 h-6" />
                    <span>Secure Airway</span>
                </button>
                <button onClick={() => logAction('LUCAS Device Applied', 'Mechanical')} className="p-4 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-xl font-bold flex flex-col items-center gap-2 border border-amber-200 dark:border-amber-800 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors shadow-sm">
                    <HeartPulse className="w-6 h-6" />
                    <span>LUCAS</span>
                </button>
            </div>

            {/* Reversible Causes */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <h4 className="font-bold text-slate-800 dark:text-white mb-3 text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-ams-blue" /> Reversible Causes (H's & T's)
                </h4>
                <div className="grid grid-cols-2 gap-2">
                    {REVERSIBLE_CAUSES.map(cause => (
                        <button 
                            key={cause} 
                            onClick={() => toggleHT(cause)}
                            className={`px-3 py-2 rounded-lg text-xs font-bold text-left transition-all border ${
                                htList.includes(cause) 
                                ? 'bg-green-100 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400' 
                                : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                        >
                            {htList.includes(cause) && <CheckSquare className="w-3 h-3 inline mr-1" />}
                            {cause}
                        </button>
                    ))}
                </div>
            </div>

            {/* Event Log Preview */}
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 max-h-48 overflow-y-auto">
                <h4 className="font-bold text-xs uppercase text-slate-500 mb-2">Session Log</h4>
                <div className="space-y-1">
                    {initialLog.slice().reverse().map(log => (
                        <div key={log.id} className="text-xs flex justify-between text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 pb-1 last:border-0">
                            <span className="font-bold">{log.action}</span>
                            <span className="font-mono text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                    ))}
                    {initialLog.length === 0 && <p className="text-xs text-slate-400 italic">No events logged yet.</p>}
                </div>
            </div>
        </div>
    );
};

export default ResusManager;
