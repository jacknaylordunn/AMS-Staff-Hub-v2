import React, { useState } from 'react';
import { useEPRF } from '../../context/EPRFContext';
import { VitalsEntry } from '../../types';
import { Plus, ArrowUp, ArrowDown, Minus, Info } from 'lucide-react';
import VitalsChart from '../VitalsChart';

// Internal Stepper Component for rapid data entry
const NumberStepper = ({ label, value, onChange, min = 0, max = 250, step = 1, suffix = '', defaultValue = 0 }: any) => {
    const handleIncrement = () => {
        const current = typeof value === 'number' ? value : (defaultValue || min);
        const nextVal = parseFloat((current + step).toFixed(1));
        if (nextVal <= max) onChange(nextVal);
    };
    const handleDecrement = () => {
        const current = typeof value === 'number' ? value : (defaultValue || min);
        const nextVal = parseFloat((current - step).toFixed(1));
        if (nextVal >= min) onChange(nextVal);
    };

    return (
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2 flex flex-col items-center">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{label}</span>
            <div className="flex items-center gap-2 w-full">
                <button onClick={handleDecrement} className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 active:scale-95 text-slate-600 dark:text-white font-bold text-lg">-</button>
                <div className="flex-1 text-center font-mono text-lg font-bold dark:text-white">
                    {value !== undefined ? value : '-'}<span className="text-[10px] ml-1 text-slate-400 font-sans">{suffix}</span>
                </div>
                <button onClick={handleIncrement} className="w-8 h-8 rounded-lg bg-ams-blue text-white shadow-sm flex items-center justify-center hover:bg-blue-700 active:scale-95 font-bold text-lg">+</button>
            </div>
        </div>
    );
};

const VitalsTab = () => {
    const { activeDraft, addVitals, handleNestedUpdate } = useEPRF();
    
    // Local state for the new entry form - Initialize as UNDEFINED to prevent bias
    const [entry, setEntry] = useState<Partial<VitalsEntry>>({
        hr: undefined,
        rr: undefined,
        bpSystolic: undefined,
        bpDiastolic: undefined,
        spo2: undefined,
        oxygen: false,
        temp: undefined,
        gcs: undefined,
        avpu: 'A',
        bloodGlucose: undefined,
        painScore: undefined
    });

    if (!activeDraft) return null;

    const isPaediatric = () => {
        if (!activeDraft.patient.dob) return false;
        const dob = new Date(activeDraft.patient.dob);
        const ageDifMs = Date.now() - dob.getTime();
        const ageDate = new Date(ageDifMs);
        return Math.abs(ageDate.getUTCFullYear() - 1970) < 16;
    };

    // NEWS2 Calculation Helper - Single Parameter Score
    const getParamScore = (type: 'hr' | 'rr' | 'spo2' | 'bp' | 'temp' | 'avpu' | 'o2', val: any): number => {
        const copd = activeDraft.patient.chronicHypoxia;
        if (val === undefined || val === '') return 0;
        
        // Handle AVPU first as it uses string values
        if (type === 'avpu') {
            return String(val) === 'A' ? 0 : 3;
        }

        // For other numeric parameters
        const v = Number(val);

        if (type === 'rr') {
            if (v <= 8 || v >= 25) return 3;
            if (v >= 21) return 2;
            if (v >= 9 && v <= 11) return 1;
        }
        if (type === 'spo2') {
            if (copd) {
                if (v <= 83 || (v >= 93 && entry.oxygen)) return 3; // On O2 >93 is bad for COPD scale 2
                if ((v >= 84 && v <= 85) || (v >= 95 && v <= 96 && entry.oxygen)) return 2;
                if ((v >= 86 && v <= 87) || (v >= 93 && v <= 94 && entry.oxygen)) return 1;
            } else {
                if (v <= 91) return 3;
                if (v >= 92 && v <= 93) return 2;
                if (v >= 94 && v <= 95) return 1;
            }
        }
        if (type === 'o2') {
            return val ? 2 : 0;
        }
        if (type === 'bp') { // Systolic
            if (v <= 90 || v >= 220) return 3;
            if (v >= 91 && v <= 100) return 2;
            if (v >= 101 && v <= 110) return 1;
        }
        if (type === 'hr') {
            if (v <= 40 || v >= 131) return 3;
            if (v >= 111 && v <= 130) return 2;
            if (v >= 41 && v <= 50) return 1;
        }
        if (type === 'temp') {
            if (v <= 35.0) return 3;
            if (v >= 39.1) return 2;
            if ((v >= 35.1 && v <= 36.0) || (v >= 38.1 && v <= 39.0)) return 1;
        }
        return 0;
    };

    const calculateTotalScore = (vals: Partial<VitalsEntry>) => {
        let total = 0;
        total += getParamScore('rr', vals.rr);
        total += getParamScore('spo2', vals.spo2);
        total += getParamScore('o2', vals.oxygen);
        total += getParamScore('bp', vals.bpSystolic);
        total += getParamScore('hr', vals.hr);
        total += getParamScore('temp', vals.temp);
        total += getParamScore('avpu', vals.avpu);
        return total;
    };

    const handleAdd = () => {
        // Validation: At least one field (besides booleans/defaults) must be entered
        const hasData = [
            entry.hr, entry.rr, entry.bpSystolic, entry.spo2, entry.temp, 
            entry.bloodGlucose, entry.painScore, entry.gcs
        ].some(val => val !== undefined && val !== null);

        if (!hasData) {
            alert("Please enter at least one measurement.");
            return;
        }
        
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const score = calculateTotalScore(entry);
        
        const newVitals: VitalsEntry = {
            time: timeString,
            hr: entry.hr,
            rr: entry.rr,
            bpSystolic: entry.bpSystolic,
            bpDiastolic: entry.bpDiastolic,
            spo2: entry.spo2,
            oxygen: entry.oxygen || false,
            oxygenFlow: entry.oxygenFlow,
            oxygenDevice: entry.oxygenDevice,
            temp: entry.temp,
            gcs: entry.gcs,
            avpu: entry.avpu as any || 'A',
            bloodGlucose: entry.bloodGlucose,
            painScore: entry.painScore,
            news2Score: score,
            popsScore: isPaediatric() ? 0 : undefined 
        };

        addVitals(newVitals);
        
        // STRICT RESET: Set everything to undefined
        setEntry({
            hr: undefined,
            rr: undefined,
            bpSystolic: undefined,
            bpDiastolic: undefined,
            spo2: undefined,
            oxygen: false,
            oxygenFlow: '',
            oxygenDevice: '',
            temp: undefined,
            gcs: undefined,
            avpu: 'A',
            bloodGlucose: undefined,
            painScore: undefined
        });
    };

    const getScoreStyle = (score: number) => {
        if (score === 3) return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800';
        if (score === 2) return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800';
        if (score === 1) return 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800';
        return 'text-slate-700 dark:text-slate-300';
    };

    const getTrendIcon = (current: number | undefined, prev: number | undefined) => {
        if (current === undefined || prev === undefined) return null;
        if (current > prev) return <ArrowUp className="w-3 h-3 text-slate-400" />;
        if (current < prev) return <ArrowDown className="w-3 h-3 text-slate-400" />;
        return <Minus className="w-3 h-3 text-slate-200" />;
    };

    return (
        <div className="space-y-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg">
                <label className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-200 cursor-pointer text-xs">
                    <input 
                        type="checkbox" 
                        className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500" 
                        checked={activeDraft.patient.chronicHypoxia} 
                        onChange={e => handleNestedUpdate(['patient', 'chronicHypoxia'], e.target.checked)} 
                    />
                    Patient has COPD / Chronic Hypoxia (Target SpO2 88-92%)
                </label>
            </div>

            <VitalsChart data={activeDraft.vitals as any} />

            {/* Comprehensive Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                            <tr>
                                <th className="px-2 py-2 border-r border-slate-200 dark:border-slate-700 w-16">Time</th>
                                <th className="px-2 py-2 border-r border-slate-200 dark:border-slate-700 text-center">Resp</th>
                                <th className="px-2 py-2 border-r border-slate-200 dark:border-slate-700 text-center">SpO2</th>
                                <th className="px-2 py-2 border-r border-slate-200 dark:border-slate-700 text-center">O2</th>
                                <th className="px-2 py-2 border-r border-slate-200 dark:border-slate-700 text-center">BP</th>
                                <th className="px-2 py-2 border-r border-slate-200 dark:border-slate-700 text-center">Pulse</th>
                                <th className="px-2 py-2 border-r border-slate-200 dark:border-slate-700 text-center">Temp</th>
                                <th className="px-2 py-2 border-r border-slate-200 dark:border-slate-700 text-center">AVPU</th>
                                <th className="px-2 py-2 border-r border-slate-200 dark:border-slate-700 text-center">BM</th>
                                <th className="px-2 py-2 border-r border-slate-200 dark:border-slate-700 text-center">Pain</th>
                                <th className="px-2 py-2 text-center w-12">NEWS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-xs">
                            {activeDraft.vitals.map((v, i) => {
                                const prev = activeDraft.vitals[i - 1];
                                return (
                                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-2 py-2 border-r border-slate-200 dark:border-slate-700 font-mono">{v.time}</td>
                                        
                                        <td className={`px-2 py-2 border-r border-slate-200 dark:border-slate-700 text-center ${getScoreStyle(getParamScore('rr', v.rr))}`}>
                                            <div className="flex items-center justify-center gap-1">{v.rr ?? '-'} {getTrendIcon(v.rr, prev?.rr)}</div>
                                        </td>
                                        
                                        <td className={`px-2 py-2 border-r border-slate-200 dark:border-slate-700 text-center ${getScoreStyle(getParamScore('spo2', v.spo2))}`}>
                                            <div className="flex items-center justify-center gap-1">{v.spo2 ? `${v.spo2}%` : '-'} {getTrendIcon(v.spo2, prev?.spo2)}</div>
                                        </td>
                                        
                                        <td className={`px-2 py-2 border-r border-slate-200 dark:border-slate-700 text-center ${v.oxygen ? 'bg-slate-100 dark:bg-slate-800' : ''}`}>
                                            {v.oxygen ? (v.oxygenDevice || 'Supp') : 'Air'}
                                        </td>
                                        
                                        <td className={`px-2 py-2 border-r border-slate-200 dark:border-slate-700 text-center ${getScoreStyle(getParamScore('bp', v.bpSystolic))}`}>
                                            <div className="flex items-center justify-center gap-1">{v.bpSystolic ?? '-'}/{v.bpDiastolic ?? '-'} {getTrendIcon(v.bpSystolic, prev?.bpSystolic)}</div>
                                        </td>
                                        
                                        <td className={`px-2 py-2 border-r border-slate-200 dark:border-slate-700 text-center ${getScoreStyle(getParamScore('hr', v.hr))}`}>
                                            <div className="flex items-center justify-center gap-1">{v.hr ?? '-'} {getTrendIcon(v.hr, prev?.hr)}</div>
                                        </td>
                                        
                                        <td className={`px-2 py-2 border-r border-slate-200 dark:border-slate-700 text-center ${getScoreStyle(getParamScore('temp', v.temp))}`}>
                                            {v.temp ?? '-'}
                                        </td>
                                        
                                        <td className={`px-2 py-2 border-r border-slate-200 dark:border-slate-700 text-center ${getScoreStyle(getParamScore('avpu', v.avpu))}`}>
                                            {v.avpu === 'A' ? v.gcs ?? '-' : v.avpu}
                                        </td>
                                        
                                        <td className="px-2 py-2 border-r border-slate-200 dark:border-slate-700 text-center text-slate-500">
                                            {v.bloodGlucose ?? '-'}
                                        </td>
                                        
                                        <td className="px-2 py-2 border-r border-slate-200 dark:border-slate-700 text-center text-slate-500">
                                            {v.painScore ?? '-'}
                                        </td>
                                        
                                        <td className="px-2 py-2 text-center">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${v.news2Score >= 7 ? 'bg-red-600 text-white' : v.news2Score >= 5 ? 'bg-amber-500 text-white' : v.news2Score >= 1 ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                                {v.news2Score}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                            {activeDraft.vitals.length === 0 && (
                                <tr><td colSpan={11} className="p-8 text-center text-slate-400 italic text-xs">No vitals recorded. Add entry below.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Quick Entry Form */}
            <div className="glass-panel p-4 rounded-xl animate-in fade-in">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-slate-800 dark:text-white text-base">Add Observations</h3>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">PROTOCOL:</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${activeDraft.patient.chronicHypoxia ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>
                            {activeDraft.patient.chronicHypoxia ? 'NEWS2 Scale 2 (COPD)' : isPaediatric() ? 'POPS (Paediatric)' : 'NEWS2 Standard'}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                    <NumberStepper label="Resp Rate" value={entry.rr} onChange={(v:number) => setEntry({...entry, rr: v})} min={0} max={60} defaultValue={16} />
                    <NumberStepper label="SpO2 %" value={entry.spo2} onChange={(v:number) => setEntry({...entry, spo2: v})} min={50} max={100} defaultValue={98} />
                    <NumberStepper label="Heart Rate" value={entry.hr} onChange={(v:number) => setEntry({...entry, hr: v})} min={0} max={250} defaultValue={70} />
                    
                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2 flex flex-col items-center">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Temp °C</span>
                        <input type="number" step="0.1" className="w-full text-center text-lg font-mono font-bold bg-transparent outline-none dark:text-white" value={entry.temp ?? ''} onChange={e => setEntry({...entry, temp: parseFloat(e.target.value)})} placeholder="--" />
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div><label className="input-label">BP (Sys)</label><input type="number" className="input-field py-1.5 px-3 text-sm h-8" value={entry.bpSystolic ?? ''} onChange={e => setEntry({...entry, bpSystolic: Number(e.target.value)})} placeholder="--" /></div>
                    <div><label className="input-label">BP (Dia)</label><input type="number" className="input-field py-1.5 px-3 text-sm h-8" value={entry.bpDiastolic ?? ''} onChange={e => setEntry({...entry, bpDiastolic: Number(e.target.value)})} placeholder="--" /></div>
                    
                    <div className="col-span-2 flex gap-2 items-end">
                        <div className="flex-1"><label className="input-label">O2 Therapy</label>
                            <div className="flex items-center gap-2 h-8 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl">
                                <input type="checkbox" checked={entry.oxygen} onChange={e => setEntry({...entry, oxygen: e.target.checked})} className="w-4 h-4 text-ams-blue" />
                                <span className="text-xs font-bold dark:text-white">Active</span>
                            </div>
                        </div>
                        {entry.oxygen && (
                            <div className="flex-1">
                                <select className="input-field py-1.5 px-3 text-sm h-8" value={entry.oxygenDevice || ''} onChange={e => setEntry({...entry, oxygenDevice: e.target.value})}><option>Nasal</option><option>Hudson</option><option>Non-Reb</option><option>Venturi</option></select>
                            </div>
                        )}
                    </div>
                    
                    <div><label className="input-label">GCS</label><input type="number" className="input-field py-1.5 px-3 text-sm h-8" value={entry.gcs ?? ''} onChange={e => setEntry({...entry, gcs: Number(e.target.value)})} max={15} placeholder="--" /></div>
                    <div><label className="input-label">AVPU</label><select className="input-field py-1.5 px-3 text-sm h-8" value={entry.avpu} onChange={e => setEntry({...entry, avpu: e.target.value as any})}><option>A</option><option>V</option><option>P</option><option>U</option></select></div>
                    
                    <div><label className="input-label">BM (mmol/L)</label><input type="number" className="input-field py-1.5 px-3 text-sm h-8" value={entry.bloodGlucose ?? ''} onChange={e => setEntry({...entry, bloodGlucose: Number(e.target.value)})} placeholder="--" /></div>
                    <div><label className="input-label">Pain (0-10)</label><input type="number" className="input-field py-1.5 px-3 text-sm h-8" value={entry.painScore ?? ''} onChange={e => setEntry({...entry, painScore: Number(e.target.value)})} max={10} placeholder="--" /></div>
                </div>

                <div className="mt-4 flex justify-end">
                    <button onClick={handleAdd} className="bg-ams-blue text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm text-sm">
                        <Plus className="w-4 h-4" /> Record Vitals
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VitalsTab;