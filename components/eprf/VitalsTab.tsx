
import React, { useState } from 'react';
import { useEPRF } from '../../context/EPRFContext';
import { VitalsEntry } from '../../types';
import { Plus, Trash2, AlertCircle, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import VitalsChart from '../VitalsChart';

const VitalsTab = () => {
    const { activeDraft, addVitals, handleNestedUpdate } = useEPRF();
    
    // Local state for the new entry form
    const [entry, setEntry] = useState<Partial<VitalsEntry>>({
        hr: undefined,
        rr: undefined,
        bpSystolic: undefined,
        bpDiastolic: undefined,
        spo2: undefined,
        oxygen: false,
        temp: undefined,
        gcs: 15,
        avpu: 'A',
        bloodGlucose: undefined,
        painScore: 0
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
        if (type === 'avpu') {
            return val === 'A' ? 0 : 3;
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
        if (!entry.hr || !entry.rr || !entry.bpSystolic) {
            alert("Please enter at least HR, RR, and BP.");
            return;
        }
        
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const score = calculateTotalScore(entry);
        
        const newVitals: VitalsEntry = {
            time: timeString,
            hr: Number(entry.hr),
            rr: Number(entry.rr),
            bpSystolic: Number(entry.bpSystolic),
            bpDiastolic: Number(entry.bpDiastolic || 0),
            spo2: Number(entry.spo2 || 99),
            oxygen: entry.oxygen || false,
            oxygenFlow: entry.oxygenFlow,
            oxygenDevice: entry.oxygenDevice,
            temp: Number(entry.temp || 36.5),
            gcs: Number(entry.gcs || 15),
            avpu: entry.avpu as any || 'A',
            bloodGlucose: entry.bloodGlucose ? Number(entry.bloodGlucose) : undefined,
            painScore: Number(entry.painScore || 0),
            news2Score: score,
            popsScore: isPaediatric() ? 0 : undefined 
        };

        addVitals(newVitals);
        setEntry({ ...entry, hr: undefined, rr: undefined, bpSystolic: undefined });
    };

    const getScoreStyle = (score: number) => {
        if (score === 3) return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800';
        if (score === 2) return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800';
        if (score === 1) return 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800';
        return 'text-slate-700 dark:text-slate-300';
    };

    const getTrendIcon = (current: number, prev: number | undefined) => {
        if (prev === undefined) return null;
        if (current > prev) return <ArrowUp className="w-3 h-3 text-slate-400" />;
        if (current < prev) return <ArrowDown className="w-3 h-3 text-slate-400" />;
        return <Minus className="w-3 h-3 text-slate-200" />;
    };

    return (
        <div className="space-y-6">
            <VitalsChart data={activeDraft.vitals} />

            {/* Comprehensive Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-3 py-3 border-r border-slate-200 dark:border-slate-700 w-24">Time</th>
                                <th className="px-3 py-3 border-r border-slate-200 dark:border-slate-700 text-center w-16">Resp</th>
                                <th className="px-3 py-3 border-r border-slate-200 dark:border-slate-700 text-center w-16">SpO2</th>
                                <th className="px-3 py-3 border-r border-slate-200 dark:border-slate-700 text-center w-20">Air/O2</th>
                                <th className="px-3 py-3 border-r border-slate-200 dark:border-slate-700 text-center w-20">BP</th>
                                <th className="px-3 py-3 border-r border-slate-200 dark:border-slate-700 text-center w-16">Pulse</th>
                                <th className="px-3 py-3 border-r border-slate-200 dark:border-slate-700 text-center w-16">Temp</th>
                                <th className="px-3 py-3 border-r border-slate-200 dark:border-slate-700 text-center w-20">Consc</th>
                                <th className="px-3 py-3 border-r border-slate-200 dark:border-slate-700 text-center w-16">BM</th>
                                <th className="px-3 py-3 border-r border-slate-200 dark:border-slate-700 text-center w-16">Pain</th>
                                <th className="px-3 py-3 text-center w-20">NEWS2</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                            {activeDraft.vitals.map((v, i) => {
                                const prev = activeDraft.vitals[i - 1];
                                return (
                                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-3 py-3 border-r border-slate-200 dark:border-slate-700 font-mono text-xs">{v.time}</td>
                                        
                                        <td className={`px-3 py-3 border-r border-slate-200 dark:border-slate-700 text-center ${getScoreStyle(getParamScore('rr', v.rr))}`}>
                                            <div className="flex items-center justify-center gap-1">{v.rr} {getTrendIcon(v.rr, prev?.rr)}</div>
                                        </td>
                                        
                                        <td className={`px-3 py-3 border-r border-slate-200 dark:border-slate-700 text-center ${getScoreStyle(getParamScore('spo2', v.spo2))}`}>
                                            <div className="flex items-center justify-center gap-1">{v.spo2}% {getTrendIcon(v.spo2, prev?.spo2)}</div>
                                        </td>
                                        
                                        <td className={`px-3 py-3 border-r border-slate-200 dark:border-slate-700 text-center text-xs ${v.oxygen ? 'bg-slate-100 dark:bg-slate-800' : ''}`}>
                                            {v.oxygen ? (v.oxygenDevice || 'Supp') : 'Air'}
                                        </td>
                                        
                                        <td className={`px-3 py-3 border-r border-slate-200 dark:border-slate-700 text-center ${getScoreStyle(getParamScore('bp', v.bpSystolic))}`}>
                                            <div className="flex items-center justify-center gap-1">{v.bpSystolic}/{v.bpDiastolic} {getTrendIcon(v.bpSystolic, prev?.bpSystolic)}</div>
                                        </td>
                                        
                                        <td className={`px-3 py-3 border-r border-slate-200 dark:border-slate-700 text-center ${getScoreStyle(getParamScore('hr', v.hr))}`}>
                                            <div className="flex items-center justify-center gap-1">{v.hr} {getTrendIcon(v.hr, prev?.hr)}</div>
                                        </td>
                                        
                                        <td className={`px-3 py-3 border-r border-slate-200 dark:border-slate-700 text-center ${getScoreStyle(getParamScore('temp', v.temp))}`}>
                                            {v.temp}
                                        </td>
                                        
                                        <td className={`px-3 py-3 border-r border-slate-200 dark:border-slate-700 text-center ${getScoreStyle(getParamScore('avpu', v.avpu))}`}>
                                            {v.avpu === 'A' ? v.gcs : v.avpu}
                                        </td>
                                        
                                        <td className="px-3 py-3 border-r border-slate-200 dark:border-slate-700 text-center text-slate-500">
                                            {v.bloodGlucose || '-'}
                                        </td>
                                        
                                        <td className="px-3 py-3 border-r border-slate-200 dark:border-slate-700 text-center text-slate-500">
                                            {v.painScore}
                                        </td>
                                        
                                        <td className="px-3 py-3 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${v.news2Score >= 7 ? 'bg-red-600 text-white' : v.news2Score >= 5 ? 'bg-amber-500 text-white' : v.news2Score >= 1 ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                                {v.news2Score}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                            {activeDraft.vitals.length === 0 && (
                                <tr><td colSpan={11} className="p-8 text-center text-slate-400 italic">No vitals recorded. Add entry below.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Entry Form */}
            <div className="glass-panel p-6 rounded-2xl animate-in fade-in">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800 dark:text-white text-lg">Add Observations</h3>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">PROTOCOL:</span>
                        <span className={`px-3 py-1 rounded text-xs font-bold ${activeDraft.patient.chronicHypoxia ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>
                            {activeDraft.patient.chronicHypoxia ? 'NEWS2 Scale 2 (COPD)' : isPaediatric() ? 'POPS (Paediatric)' : 'NEWS2 Standard'}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    <div><label className="input-label">RR</label><input type="number" className="input-field" value={entry.rr || ''} onChange={e => setEntry({...entry, rr: Number(e.target.value)})} placeholder="12-20" /></div>
                    <div><label className="input-label">SpO2 %</label><input type="number" className="input-field" value={entry.spo2 || ''} onChange={e => setEntry({...entry, spo2: Number(e.target.value)})} placeholder="94-100" /></div>
                    
                    <div className="col-span-2 flex gap-2 items-end">
                        <div className="flex-1"><label className="input-label">O2 Therapy</label>
                            <div className="flex items-center gap-2 h-[46px] px-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl">
                                <input type="checkbox" checked={entry.oxygen} onChange={e => setEntry({...entry, oxygen: e.target.checked})} className="w-5 h-5 text-ams-blue" />
                                <span className="text-sm font-bold dark:text-white">Active</span>
                            </div>
                        </div>
                        {entry.oxygen && (
                            <div className="flex-1">
                                <select className="input-field" value={entry.oxygenDevice} onChange={e => setEntry({...entry, oxygenDevice: e.target.value})}><option>Nasal</option><option>Hudson</option><option>Non-Reb</option><option>Venturi</option></select>
                            </div>
                        )}
                    </div>

                    <div><label className="input-label">BP (Sys)</label><input type="number" className="input-field" value={entry.bpSystolic || ''} onChange={e => setEntry({...entry, bpSystolic: Number(e.target.value)})} placeholder="120" /></div>
                    <div><label className="input-label">BP (Dia)</label><input type="number" className="input-field" value={entry.bpDiastolic || ''} onChange={e => setEntry({...entry, bpDiastolic: Number(e.target.value)})} placeholder="80" /></div>
                    
                    <div><label className="input-label">Heart Rate</label><input type="number" className="input-field" value={entry.hr || ''} onChange={e => setEntry({...entry, hr: Number(e.target.value)})} placeholder="60-100" /></div>
                    <div><label className="input-label">Temp °C</label><input type="number" className="input-field" value={entry.temp || ''} onChange={e => setEntry({...entry, temp: Number(e.target.value)})} placeholder="36.5" /></div>
                    
                    <div><label className="input-label">GCS</label><input type="number" className="input-field" value={entry.gcs} onChange={e => setEntry({...entry, gcs: Number(e.target.value)})} max={15} /></div>
                    <div><label className="input-label">AVPU</label><select className="input-field" value={entry.avpu} onChange={e => setEntry({...entry, avpu: e.target.value as any})}><option>A</option><option>V</option><option>P</option><option>U</option></select></div>
                    
                    <div><label className="input-label">BM (mmol/L)</label><input type="number" className="input-field" value={entry.bloodGlucose || ''} onChange={e => setEntry({...entry, bloodGlucose: Number(e.target.value)})} placeholder="4.0-7.0" /></div>
                    <div><label className="input-label">Pain (0-10)</label><input type="number" className="input-field" value={entry.painScore} onChange={e => setEntry({...entry, painScore: Number(e.target.value)})} max={10} /></div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button onClick={handleAdd} className="bg-ams-blue text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-lg">
                        <Plus className="w-5 h-5" /> Record Vitals
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VitalsTab;
