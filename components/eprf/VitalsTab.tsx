
import React, { useState } from 'react';
import { useEPRF } from '../../context/EPRFContext';
import { VitalsEntry } from '../../types';
import { Plus, ArrowUp, ArrowDown, Minus, Ban, Trash2, Edit3, Save } from 'lucide-react';
import VitalsChart from '../VitalsChart';

// Internal Stepper Component
const NumberStepper = ({ label, value, onChange, min = 0, max = 250, step = 1, suffix = '', defaultValue = 0, onRefusalToggle, isRefused }: any) => {
    const handleIncrement = () => {
        if (isRefused) return;
        const current = typeof value === 'number' ? value : (defaultValue || min);
        const nextVal = parseFloat((current + step).toFixed(1));
        if (nextVal <= max) onChange(nextVal);
    };
    const handleDecrement = () => {
        if (isRefused) return;
        const current = typeof value === 'number' ? value : (defaultValue || min);
        const nextVal = parseFloat((current - step).toFixed(1));
        if (nextVal >= min) onChange(nextVal);
    };

    return (
        <div className={`border rounded-xl p-2 flex flex-col items-center relative transition-colors ${isRefused ? 'bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-700 opacity-70' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
            <div className="w-full flex justify-between items-center mb-1 px-1">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">{label}</span>
                {onRefusalToggle && (
                    <button 
                        onClick={onRefusalToggle}
                        className={`p-1 rounded-md transition-colors ${isRefused ? 'bg-red-100 text-red-600' : 'text-slate-300 hover:text-red-500'}`}
                        title="Mark as Refused/Unable"
                    >
                        <Ban className="w-3 h-3" />
                    </button>
                )}
            </div>
            {isRefused ? (
                <div className="flex items-center justify-center h-8 w-full text-xs font-bold text-red-500">REFUSED / UNABLE</div>
            ) : (
                <div className="flex items-center gap-2 w-full">
                    <button onClick={handleDecrement} className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 active:scale-95 text-slate-600 dark:text-white font-bold text-lg">-</button>
                    <div className="flex-1 text-center font-mono text-lg font-bold dark:text-white">
                        {value !== undefined ? value : '-'}<span className="text-[10px] ml-1 text-slate-400 font-sans">{suffix}</span>
                    </div>
                    <button onClick={handleIncrement} className="w-8 h-8 rounded-lg bg-ams-blue text-white shadow-sm flex items-center justify-center hover:bg-blue-700 active:scale-95 font-bold text-lg">+</button>
                </div>
            )}
        </div>
    );
};

const VitalsTab = () => {
    const { activeDraft, addVitals, handleNestedUpdate, updateDraft } = useEPRF();
    const [customTime, setCustomTime] = useState('');
    const [entry, setEntry] = useState<Partial<VitalsEntry>>({
        hr: undefined, rr: undefined, bpSystolic: undefined, bpDiastolic: undefined,
        spo2: undefined, oxygen: false, temp: undefined, gcs: undefined, avpu: undefined, 
        bloodGlucose: undefined, painScore: undefined,
        rrRefused: false, spo2Refused: false, bpRefused: false, hrRefused: false,
        tempRefused: false, gcsRefused: false, bloodGlucoseRefused: false, painScoreRefused: false,
        bpPosition: 'Sitting', bpLimb: 'Left'
    });

    if (!activeDraft) return null;

    const isPaediatric = () => {
        if (!activeDraft.patient.dob) return false;
        const dob = new Date(activeDraft.patient.dob);
        return Math.abs(new Date(Date.now() - dob.getTime()).getUTCFullYear() - 1970) < 16;
    };

    const getParamScore = (type: string, val: any): number => {
        if (val === undefined || val === '') return 0;
        const v = Number(val);
        const copd = activeDraft.patient.chronicHypoxia;
        
        if (type === 'avpu') return String(val) === 'A' ? 0 : 3;
        if (type === 'o2') return val ? 2 : 0;
        if (type === 'rr') { if (v <= 8 || v >= 25) return 3; if (v >= 21) return 2; if (v >= 9 && v <= 11) return 1; }
        if (type === 'spo2') {
            if (copd) { if (v <= 83 || (v >= 93 && !!entry.oxygen)) return 3; if ((v >= 84 && v <= 85) || (v >= 95 && v <= 96 && !!entry.oxygen)) return 2; if ((v >= 86 && v <= 87) || (v >= 93 && v <= 94 && !!entry.oxygen)) return 1; }
            else { if (v <= 91) return 3; if (v >= 92 && v <= 93) return 2; if (v >= 94 && v <= 95) return 1; }
        }
        if (type === 'bp') { if (v <= 90 || v >= 220) return 3; if (v >= 91 && v <= 100) return 2; if (v >= 101 && v <= 110) return 1; }
        if (type === 'hr') { if (v <= 40 || v >= 131) return 3; if (v >= 111 && v <= 130) return 2; if (v >= 41 && v <= 50) return 1; }
        if (type === 'temp') { if (v <= 35.0) return 3; if (v >= 39.1) return 2; if ((v >= 35.1 && v <= 36.0) || (v >= 38.1 && v <= 39.0)) return 1; }
        return 0;
    };

    const calculateTotalScore = (vals: Partial<VitalsEntry>) => {
        let total = 0;
        if (!vals.rrRefused) total += getParamScore('rr', vals.rr);
        if (!vals.spo2Refused) total += getParamScore('spo2', vals.spo2);
        total += getParamScore('o2', vals.oxygen);
        if (!vals.bpRefused) total += getParamScore('bp', vals.bpSystolic);
        if (!vals.hrRefused) total += getParamScore('hr', vals.hr);
        if (!vals.tempRefused) total += getParamScore('temp', vals.temp);
        if (!vals.gcsRefused) total += getParamScore('avpu', vals.avpu);
        return total;
    };

    const handleAdd = () => {
        const hasData = [entry.hr, entry.rr, entry.bpSystolic, entry.spo2, entry.temp, entry.bloodGlucose, entry.painScore, entry.gcs, entry.avpu].some(v => v !== undefined && v !== null) || [entry.hrRefused, entry.rrRefused, entry.bpRefused, entry.spo2Refused, entry.tempRefused].some(Boolean);
        if (!hasData) { alert("Please enter at least one measurement."); return; }
        
        const timeString = customTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const score = calculateTotalScore(entry);
        
        const cleanEntry = { ...entry }; // Copy all flags
        // Clean undefineds if refused
        if (entry.rrRefused) cleanEntry.rr = undefined;
        if (entry.spo2Refused) cleanEntry.spo2 = undefined;
        if (entry.hrRefused) cleanEntry.hr = undefined;
        if (entry.bpRefused) { cleanEntry.bpSystolic = undefined; cleanEntry.bpDiastolic = undefined; }
        if (entry.tempRefused) cleanEntry.temp = undefined;
        if (entry.gcsRefused) cleanEntry.gcs = undefined;

        const newVitals: VitalsEntry = {
            id: Date.now().toString(),
            time: timeString,
            news2Score: score,
            popsScore: isPaediatric() ? 0 : undefined,
            oxygen: entry.oxygen || false,
            oxygenFlow: entry.oxygenFlow,
            oxygenDevice: entry.oxygenDevice,
            avpu: entry.avpu as any || 'A',
            ...cleanEntry
        };

        addVitals(newVitals);
        setCustomTime('');
        setEntry({ hr: undefined, rr: undefined, bpSystolic: undefined, bpDiastolic: undefined, spo2: undefined, oxygen: false, temp: undefined, gcs: undefined, avpu: undefined, bloodGlucose: undefined, painScore: undefined, rrRefused: false, spo2Refused: false, bpRefused: false, hrRefused: false, tempRefused: false, gcsRefused: false, bloodGlucoseRefused: false, painScoreRefused: false, bpPosition: 'Sitting', bpLimb: 'Left' });
    };

    const deleteVital = (id?: string) => {
        if (!id) return;
        if (confirm("Delete this vital sign entry?")) {
            const newVitals = activeDraft.vitals.filter(v => v.id !== id);
            updateDraft({ vitals: newVitals });
        }
    };

    const loadForEdit = (v: VitalsEntry) => {
        if (confirm("Load this entry into the editor? This will remove it from the list until you save again.")) {
            const newVitals = activeDraft.vitals.filter(item => item.id !== v.id);
            updateDraft({ vitals: newVitals });
            setEntry(v);
            setCustomTime(v.time);
        }
    };

    const getScoreStyle = (score: number) => {
        if (score === 3) return 'bg-red-100 text-red-700 border-red-200';
        if (score === 2) return 'bg-orange-100 text-orange-700 border-orange-200';
        if (score === 1) return 'bg-yellow-50 text-yellow-700 border-yellow-200';
        return 'text-slate-700 dark:text-slate-300';
    };

    const renderCell = (value: any, refused: boolean | undefined, type: string) => {
        if (refused) return <span className="text-[10px] text-red-500 font-bold">REF</span>;
        if (value === undefined) return '-';
        const score = getParamScore(type, value);
        return <div className={`flex items-center justify-center gap-1 ${getScoreStyle(score)} rounded px-1`}>{value}</div>;
    };

    return (
        <div className="space-y-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg">
                <label className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-200 cursor-pointer text-xs">
                    <input type="checkbox" className="w-4 h-4 text-amber-600 rounded" checked={activeDraft.patient.chronicHypoxia} onChange={e => handleNestedUpdate(['patient', 'chronicHypoxia'], e.target.checked)} />
                    Patient has COPD / Chronic Hypoxia (Target SpO2 88-92%)
                </label>
            </div>

            <VitalsChart data={activeDraft.vitals as any} />

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase">
                            <tr>
                                <th className="px-2 py-2 border-r dark:border-slate-700 w-16">Time</th>
                                <th className="px-2 py-2 border-r dark:border-slate-700 text-center">Resp</th>
                                <th className="px-2 py-2 border-r dark:border-slate-700 text-center">SpO2</th>
                                <th className="px-2 py-2 border-r dark:border-slate-700 text-center">O2</th>
                                <th className="px-2 py-2 border-r dark:border-slate-700 text-center">BP</th>
                                <th className="px-2 py-2 border-r dark:border-slate-700 text-center">Pulse</th>
                                <th className="px-2 py-2 border-r dark:border-slate-700 text-center">Temp</th>
                                <th className="px-2 py-2 border-r dark:border-slate-700 text-center">AVPU</th>
                                <th className="px-2 py-2 border-r dark:border-slate-700 text-center">GCS</th>
                                <th className="px-2 py-2 border-r dark:border-slate-700 text-center">BM</th>
                                <th className="px-2 py-2 border-r dark:border-slate-700 text-center">Pain</th>
                                <th className="px-2 py-2 text-center w-12">NEWS</th>
                                <th className="px-2 py-2 text-center w-12">Act</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-xs">
                            {activeDraft.vitals.map((v, i) => (
                                <tr key={v.id || i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                    <td className="px-2 py-2 border-r dark:border-slate-700 font-mono">{v.time}</td>
                                    <td className="px-2 py-2 border-r dark:border-slate-700 text-center">{renderCell(v.rr, v.rrRefused, 'rr')}</td>
                                    <td className="px-2 py-2 border-r dark:border-slate-700 text-center">{renderCell(v.spo2, v.spo2Refused, 'spo2')}</td>
                                    <td className={`px-2 py-2 border-r dark:border-slate-700 text-center ${v.oxygen ? 'bg-slate-100 dark:bg-slate-800' : ''}`}>{v.oxygen ? (v.oxygenDevice || 'Supp') : 'Air'}</td>
                                    <td className="px-2 py-2 border-r dark:border-slate-700 text-center">{v.bpRefused ? <span className="text-red-500 font-bold">REF</span> : <div className={`flex flex-col items-center ${getScoreStyle(getParamScore('bp', v.bpSystolic))}`}><span>{v.bpSystolic ?? '-'}/{v.bpDiastolic ?? '-'}</span></div>}</td>
                                    <td className="px-2 py-2 border-r dark:border-slate-700 text-center">{renderCell(v.hr, v.hrRefused, 'hr')}</td>
                                    <td className="px-2 py-2 border-r dark:border-slate-700 text-center">{renderCell(v.temp, v.tempRefused, 'temp')}</td>
                                    <td className="px-2 py-2 border-r dark:border-slate-700 text-center">{v.gcsRefused ? 'REF' : (v.avpu || '-')}</td>
                                    <td className="px-2 py-2 border-r dark:border-slate-700 text-center">{v.gcsRefused ? 'REF' : (v.gcs || '-')}</td>
                                    <td className="px-2 py-2 border-r dark:border-slate-700 text-center text-slate-500">{v.bloodGlucoseRefused ? 'REF' : (v.bloodGlucose ?? '-')}</td>
                                    <td className="px-2 py-2 border-r dark:border-slate-700 text-center text-slate-500">{v.painScoreRefused ? 'REF' : (v.painScore ?? '-')}</td>
                                    <td className="px-2 py-2 text-center"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${v.news2Score >= 7 ? 'bg-red-600 text-white' : v.news2Score >= 5 ? 'bg-amber-500 text-white' : v.news2Score >= 1 ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-600'}`}>{v.news2Score}</span></td>
                                    <td className="px-2 py-2 text-center flex gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => loadForEdit(v)} className="text-blue-500 hover:bg-blue-50 p-1 rounded"><Edit3 className="w-3 h-3" /></button>
                                        <button onClick={() => deleteVital(v.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 className="w-3 h-3" /></button>
                                    </td>
                                </tr>
                            ))}
                            {activeDraft.vitals.length === 0 && <tr><td colSpan={13} className="p-8 text-center text-slate-400 italic text-xs">No vitals recorded. Add entry below.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Editor (Same as previous, just adding the Save button logic from handleAdd) */}
            <div className="glass-panel p-4 rounded-xl animate-in fade-in">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-slate-800 dark:text-white text-base">Add Observations</h3>
                    <div className="flex items-center gap-2">
                        <input type="time" className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-bold dark:text-white" value={customTime} onChange={e => setCustomTime(e.target.value)} />
                    </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                    <NumberStepper label="Resp Rate" value={entry.rr} onChange={(v:number) => setEntry({...entry, rr: v})} min={0} max={60} defaultValue={16} isRefused={entry.rrRefused} onRefusalToggle={() => setEntry({...entry, rrRefused: !entry.rrRefused})} />
                    <NumberStepper label="SpO2 %" value={entry.spo2} onChange={(v:number) => setEntry({...entry, spo2: v})} min={50} max={100} defaultValue={98} isRefused={entry.spo2Refused} onRefusalToggle={() => setEntry({...entry, spo2Refused: !entry.spo2Refused})} />
                    <NumberStepper label="Heart Rate" value={entry.hr} onChange={(v:number) => setEntry({...entry, hr: v})} min={0} max={250} defaultValue={70} isRefused={entry.hrRefused} onRefusalToggle={() => setEntry({...entry, hrRefused: !entry.hrRefused})} />
                    <div className={`border rounded-xl p-2 flex flex-col items-center relative transition-colors ${entry.tempRefused ? 'bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-700 opacity-70' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
                        <div className="w-full flex justify-between items-center mb-1 px-1">
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Temp °C</span>
                            <button onClick={() => setEntry({...entry, tempRefused: !entry.tempRefused})} className={`p-1 rounded-md transition-colors ${entry.tempRefused ? 'bg-red-100 text-red-600' : 'text-slate-300 hover:text-red-500'}`}><Ban className="w-3 h-3" /></button>
                        </div>
                        {entry.tempRefused ? <div className="flex items-center justify-center h-8 w-full text-xs font-bold text-red-500">REFUSED</div> : <input type="number" step="0.1" className="w-full text-center text-lg font-mono font-bold bg-transparent outline-none dark:text-white" value={entry.temp ?? ''} onChange={e => setEntry({...entry, temp: parseFloat(e.target.value)})} placeholder="--" />}
                    </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="col-span-2 p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                        <div className="flex justify-between items-center mb-2"><label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Blood Pressure</label><button onClick={() => setEntry({...entry, bpRefused: !entry.bpRefused})} className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded ${entry.bpRefused ? 'bg-red-100 text-red-600' : 'text-slate-400'}`}><Ban className="w-3 h-3" /> {entry.bpRefused ? 'Refused' : 'Mark Refused'}</button></div>
                        {entry.bpRefused ? <div className="h-10 flex items-center justify-center text-sm font-bold text-red-500">Patient Refused / Unable</div> : <div className="flex gap-2"><div className="flex-1"><input type="number" className="input-field py-1.5 px-3 text-sm h-8" value={entry.bpSystolic ?? ''} onChange={e => setEntry({...entry, bpSystolic: Number(e.target.value)})} placeholder="Sys" /></div><span className="self-center text-slate-400">/</span><div className="flex-1"><input type="number" className="input-field py-1.5 px-3 text-sm h-8" value={entry.bpDiastolic ?? ''} onChange={e => setEntry({...entry, bpDiastolic: Number(e.target.value)})} placeholder="Dia" /></div></div>}
                    </div>
                    <div className="col-span-2 flex gap-2 items-end"><div className="flex-1"><label className="input-label">O2 Therapy</label><div className="flex items-center gap-2 h-8 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl"><input type="checkbox" checked={entry.oxygen} onChange={e => setEntry({...entry, oxygen: e.target.checked})} className="w-4 h-4 text-ams-blue" /><span className="text-xs font-bold dark:text-white">Active</span></div></div>{entry.oxygen && <div className="flex-1"><select className="input-field py-1.5 px-3 text-sm h-8" value={entry.oxygenDevice || ''} onChange={e => setEntry({...entry, oxygenDevice: e.target.value})}><option>Nasal</option><option>Hudson</option><option>Non-Reb</option><option>Venturi</option></select></div>}</div>
                    <div className="relative"><div className="flex justify-between"><label className="input-label">GCS</label><button onClick={() => setEntry({...entry, gcsRefused: !entry.gcsRefused})} className={`text-[10px] font-bold ${entry.gcsRefused ? 'text-red-500' : 'text-slate-300'}`}><Ban className="w-3 h-3" /></button></div>{entry.gcsRefused ? <div className="input-field h-8 flex items-center justify-center text-xs text-red-500 font-bold bg-slate-100">REF</div> : <input type="number" className="input-field py-1.5 px-3 text-sm h-8" value={entry.gcs ?? ''} onChange={e => setEntry({...entry, gcs: Number(e.target.value)})} max={15} placeholder="--" />}</div>
                    <div><label className="input-label">AVPU</label><select className="input-field py-1.5 px-3 text-sm h-8" value={entry.avpu || ''} onChange={e => setEntry({...entry, avpu: e.target.value as any})}><option value="">Select...</option><option value="A">A</option><option value="V">V</option><option value="P">P</option><option value="U">U</option></select></div>
                    <div className="relative"><div className="flex justify-between"><label className="input-label">BM</label><button onClick={() => setEntry({...entry, bloodGlucoseRefused: !entry.bloodGlucoseRefused})} className={`text-[10px] font-bold ${entry.bloodGlucoseRefused ? 'text-red-500' : 'text-slate-300'}`}><Ban className="w-3 h-3" /></button></div>{entry.bloodGlucoseRefused ? <div className="input-field h-8 flex items-center justify-center text-xs text-red-500 font-bold bg-slate-100">REF</div> : <input type="number" className="input-field py-1.5 px-3 text-sm h-8" value={entry.bloodGlucose ?? ''} onChange={e => setEntry({...entry, bloodGlucose: Number(e.target.value)})} placeholder="mmol/L" />}</div>
                    <div className="relative"><div className="flex justify-between"><label className="input-label">Pain</label><button onClick={() => setEntry({...entry, painScoreRefused: !entry.painScoreRefused})} className={`text-[10px] font-bold ${entry.painScoreRefused ? 'text-red-500' : 'text-slate-300'}`}><Ban className="w-3 h-3" /></button></div>{entry.painScoreRefused ? <div className="input-field h-8 flex items-center justify-center text-xs text-red-500 font-bold bg-slate-100">REF</div> : <input type="number" className="input-field py-1.5 px-3 text-sm h-8" value={entry.painScore ?? ''} onChange={e => setEntry({...entry, painScore: Number(e.target.value)})} max={10} placeholder="0-10" />}</div>
                </div>
                <div className="mt-4 flex justify-end">
                    <button onClick={handleAdd} className="bg-ams-blue text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm text-sm"><Save className="w-4 h-4" /> Save Vitals</button>
                </div>
            </div>
        </div>
    );
};

export default VitalsTab;
