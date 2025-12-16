
import React, { useState } from 'react';
import { AlertOctagon, CheckSquare, Square, Thermometer, Droplets, Pill, Wind, Beaker, Timer } from 'lucide-react';

interface SepsisToolProps {
    newsScore: number;
}

const SepsisTool: React.FC<SepsisToolProps> = ({ newsScore }) => {
    const [redFlags, setRedFlags] = useState<string[]>([]);
    const [sepsisSix, setSepsisSix] = useState<string[]>([]);

    const toggleRedFlag = (flag: string) => {
        setRedFlags(prev => prev.includes(flag) ? prev.filter(f => f !== flag) : [...prev, flag]);
    };

    const toggleSepsisSix = (action: string) => {
        setSepsisSix(prev => prev.includes(action) ? prev.filter(a => a !== action) : [...prev, action]);
    };

    const RED_FLAGS = [
        'Objective evidence of new confusion',
        'Resp Rate >= 25',
        'Needs oxygen to keep SpO2 >= 92% (88% COPD)',
        'Heart Rate > 130',
        'Systolic BP <= 90 mmHg',
        'Not passed urine in last 18 hours',
        'Non-blanching rash',
        'Recent Chemotherapy / Immunosuppressed'
    ];

    const SEPSIS_SIX = [
        { id: 'o2', label: 'Give High Flow Oxygen', icon: Wind },
        { id: 'iv', label: 'Blood Cultures / IV Access', icon: Beaker },
        { id: 'abx', label: 'Give IV Antibiotics', icon: Pill },
        { id: 'fluid', label: 'Give IV Fluid Challenge', icon: Droplets },
        { id: 'lac', label: 'Measure Lactate', icon: Activity }, // Activity icon imported below implicitly or swapped
        { id: 'urine', label: 'Monitor Urine Output', icon: Timer }
    ];

    const isSepsisLikely = newsScore >= 5 || redFlags.length > 0;

    return (
        <div className={`rounded-xl border-2 transition-all overflow-hidden ${isSepsisLikely ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : 'border-slate-200 bg-white dark:bg-slate-900'}`}>
            <div className={`p-4 flex justify-between items-center ${isSepsisLikely ? 'bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-100' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                <h4 className="font-bold flex items-center gap-2">
                    <AlertOctagon className="w-5 h-5" /> Sepsis Screening Tool
                </h4>
                <div className="font-mono font-bold text-sm">NEWS2: {newsScore}</div>
            </div>

            <div className="p-4 space-y-6">
                <div>
                    <h5 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">Red Flags (Tick if present)</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {RED_FLAGS.map(flag => (
                            <button
                                key={flag}
                                onClick={() => toggleRedFlag(flag)}
                                className={`text-left p-3 rounded-lg text-xs font-bold border transition-all flex items-center gap-2 ${redFlags.includes(flag) ? 'bg-red-600 text-white border-red-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}
                            >
                                {redFlags.includes(flag) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                {flag}
                            </button>
                        ))}
                    </div>
                </div>

                {isSepsisLikely && (
                    <div className="animate-in slide-in-from-top-4 fade-in">
                        <div className="bg-red-600 text-white p-4 rounded-xl text-center mb-4 shadow-lg">
                            <h3 className="text-xl font-bold uppercase tracking-widest animate-pulse">Sepsis Alert</h3>
                            <p className="text-sm font-medium">Initiate Sepsis 6 Pathway Immediately</p>
                        </div>

                        <h5 className="text-xs font-bold uppercase text-red-800 dark:text-red-300 mb-2">Sepsis 6 Bundle Actions</h5>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {SEPSIS_SIX.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => toggleSepsisSix(item.id)}
                                    className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 text-center transition-all ${sepsisSix.includes(item.id) ? 'bg-green-100 border-green-500 text-green-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 opacity-80'}`}
                                >
                                    <item.icon className={`w-6 h-6 ${sepsisSix.includes(item.id) ? 'text-green-600' : 'text-slate-400'}`} />
                                    <span className="text-xs font-bold">{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Simplified icon import hack for standalone use
import { Activity } from 'lucide-react';

export default SepsisTool;
