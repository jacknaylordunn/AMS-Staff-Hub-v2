
import React, { useState } from 'react';
import { Calculator, Activity, Flame, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import GCSCalculator from '../components/GCSCalculator';

const CalculatorCard = ({ title, icon: Icon, children }: any) => (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center gap-2">
            <Icon className="w-5 h-5 text-ams-blue" />
            <h3 className="font-bold text-slate-800 dark:text-white">{title}</h3>
        </div>
        <div className="p-6">
            {children}
        </div>
    </div>
);

const CalculatorsPage = () => {
    // Parkland State
    const [parkland, setParkland] = useState({ weight: '', tbsa: '' });
    
    // Wells State
    const [wellsScore, setWellsScore] = useState(0);
    const [wellsCriteria, setWellsCriteria] = useState<string[]>([]);

    const calculateParkland = () => {
        const w = parseFloat(parkland.weight);
        const t = parseFloat(parkland.tbsa);
        if (!w || !t) return null;
        const total = 4 * w * t;
        return {
            total: Math.round(total),
            first8: Math.round(total / 2),
            next16: Math.round(total / 2)
        };
    };

    const parklandResult = calculateParkland();

    const toggleWells = (criteria: string, points: number) => {
        if (wellsCriteria.includes(criteria)) {
            setWellsCriteria(prev => prev.filter(c => c !== criteria));
            setWellsScore(prev => prev - points);
        } else {
            setWellsCriteria(prev => [...prev, criteria]);
            setWellsScore(prev => prev + points);
        }
    };

    const WELLS_CRITERIA = [
        { label: 'Active Cancer', points: 1 },
        { label: 'Paralysis, paresis, or immobilization of lower extremities', points: 1 },
        { label: 'Bedridden >3 days or major surgery <12 weeks', points: 1 },
        { label: 'Localized tenderness along deep venous system', points: 1 },
        { label: 'Entire leg swollen', points: 1 },
        { label: 'Calf swelling >3cm larger than asymptomatic side', points: 1 },
        { label: 'Pitting edema confined to symptomatic leg', points: 1 },
        { label: 'Collateral superficial veins (non-varicose)', points: 1 },
        { label: 'Previous DVT documented', points: 1 },
        { label: 'Alternative diagnosis at least as likely as DVT', points: -2 },
    ];

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Clinical Tools</h1>
                <p className="text-slate-500 dark:text-slate-400">Standardized calculators to support clinical decision making.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Parkland Formula */}
                <CalculatorCard title="Parkland Formula (Burns)" icon={Flame}>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="input-label">Weight (kg)</label>
                                <input 
                                    type="number" 
                                    className="input-field" 
                                    value={parkland.weight} 
                                    onChange={e => setParkland({...parkland, weight: e.target.value})}
                                    placeholder="80"
                                />
                            </div>
                            <div>
                                <label className="input-label">% TBSA (Total Body Surface Area)</label>
                                <input 
                                    type="number" 
                                    className="input-field" 
                                    value={parkland.tbsa} 
                                    onChange={e => setParkland({...parkland, tbsa: e.target.value})}
                                    placeholder="20"
                                />
                            </div>
                        </div>

                        {parklandResult ? (
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                                <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-2">Fluid Resuscitation (Hartmann's)</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-slate-600 dark:text-slate-400">Total 24hrs:</span>
                                        <span className="text-lg font-bold text-slate-800 dark:text-white">{parklandResult.total} ml</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-blue-200 dark:border-blue-800">
                                        <span className="text-sm text-slate-600 dark:text-slate-400">First 8 Hours:</span>
                                        <span className="font-bold text-slate-800 dark:text-white">{parklandResult.first8} ml</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-slate-600 dark:text-slate-400">Next 16 Hours:</span>
                                        <span className="font-bold text-slate-800 dark:text-white">{parklandResult.next16} ml</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-slate-400 text-sm py-4 italic">Enter weight and burn area to calculate.</div>
                        )}
                        <p className="text-[10px] text-slate-400 mt-2">Formula: 4ml x Weight(kg) x %TBSA. Half in first 8 hours.</p>
                    </div>
                </CalculatorCard>

                {/* Wells Score */}
                <CalculatorCard title="Wells Score (DVT)" icon={Activity}>
                    <div className="space-y-2">
                        {WELLS_CRITERIA.map((criterion, idx) => (
                            <button
                                key={idx}
                                onClick={() => toggleWells(criterion.label, criterion.points)}
                                className={`w-full text-left p-3 rounded-lg border text-sm flex justify-between items-center transition-all ${
                                    wellsCriteria.includes(criterion.label)
                                    ? 'bg-ams-blue text-white border-ams-blue shadow-md'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                                }`}
                            >
                                <span>{criterion.label}</span>
                                <span className={`font-bold ml-2 ${wellsCriteria.includes(criterion.label) ? 'text-white' : 'text-slate-400'}`}>
                                    {criterion.points > 0 ? `+${criterion.points}` : criterion.points}
                                </span>
                            </button>
                        ))}
                        
                        <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <div className="text-center">
                                <span className="block text-xs font-bold text-slate-500 uppercase">Score</span>
                                <span className="text-3xl font-bold text-slate-800 dark:text-white">{wellsScore}</span>
                            </div>
                            <div className="text-right">
                                <span className="block text-xs font-bold text-slate-500 uppercase mb-1">Risk Probability</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                    wellsScore >= 2 
                                    ? 'bg-red-100 text-red-700 border border-red-200' 
                                    : 'bg-green-100 text-green-700 border border-green-200'
                                }`}>
                                    {wellsScore >= 2 ? 'DVT LIKELY (≥2)' : 'DVT UNLIKELY (<2)'}
                                </span>
                            </div>
                        </div>
                    </div>
                </CalculatorCard>

            </div>
        </div>
    );
};

export default CalculatorsPage;
