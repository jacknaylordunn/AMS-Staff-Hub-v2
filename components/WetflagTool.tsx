
import React, { useState } from 'react';
import { Baby, Calculator, ArrowRight } from 'lucide-react';

const WetflagTool = () => {
    const [age, setAge] = useState<string>('');
    const [ageUnit, setAgeUnit] = useState<'Years' | 'Months'>('Years');

    const calculate = () => {
        const val = parseFloat(age);
        if (isNaN(val)) return null;

        let weight = 0;
        if (ageUnit === 'Months') {
            weight = (0.5 * val) + 4;
        } else {
            if (val < 1) weight = (0.5 * (val * 12)) + 4; // Handle decimal years like 0.5
            else if (val >= 1 && val <= 5) weight = (2 * val) + 8;
            else if (val >= 6 && val <= 12) weight = (3 * val) + 7;
            else weight = (3 * val) + 7; // Approx formula continuation
        }

        // Round weight nicely
        weight = Math.round(weight * 10) / 10;

        const energy = Math.round(4 * weight);
        const tube = ageUnit === 'Months' ? 'Uncuffed 3.5-4.0' : `Uncuffed ${(val / 4) + 4}`;
        const fluids = Math.round(20 * weight); // 20ml/kg bolus
        const lorazepam = (0.1 * weight).toFixed(2);
        
        // Adrenaline 1:10,000 (10mcg/kg = 0.1ml/kg)
        const adrenalineVol = (0.1 * weight).toFixed(1);
        
        // Glucose 10% (2ml/kg)
        const glucose = Math.round(2 * weight);

        return { weight, energy, tube, fluids, lorazepam, adrenalineVol, glucose };
    };

    const result = calculate();

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 bg-pink-50 dark:bg-pink-900/20 border-b border-pink-100 dark:border-pink-900/30 flex justify-between items-center">
                <h4 className="font-bold text-pink-800 dark:text-pink-200 flex items-center gap-2">
                    <Baby className="w-5 h-5" /> Paediatric WETFLAG
                </h4>
                <div className="flex gap-2">
                    <input 
                        type="number" 
                        className="w-16 p-1 text-center rounded border border-pink-200 dark:border-pink-800 bg-white dark:bg-slate-800 text-sm font-bold dark:text-white"
                        placeholder="Age"
                        value={age}
                        onChange={e => setAge(e.target.value)}
                    />
                    <select 
                        className="p-1 rounded border border-pink-200 dark:border-pink-800 bg-white dark:bg-slate-800 text-sm text-pink-800 dark:text-pink-200"
                        value={ageUnit}
                        onChange={e => setAgeUnit(e.target.value as any)}
                    >
                        <option>Years</option>
                        <option>Months</option>
                    </select>
                </div>
            </div>

            {result ? (
                <div className="p-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Weight (Est)</span>
                            <span className="text-lg font-bold text-slate-800 dark:text-white">{result.weight} kg</span>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Energy (4J/kg)</span>
                            <span className="text-lg font-bold text-red-600 dark:text-red-400">{result.energy} J</span>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Tube (ET)</span>
                            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{result.tube}</span>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Fluid Bolus</span>
                            <span className="text-lg font-bold text-slate-800 dark:text-white">{result.fluids} ml</span>
                        </div>
                    </div>
                    
                    <div className="mt-4 space-y-2 border-t border-slate-100 dark:border-slate-700 pt-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="font-bold text-slate-600 dark:text-slate-300">Adrenaline 1:10,000</span>
                            <span className="font-mono font-bold text-purple-600 dark:text-purple-400">{result.adrenalineVol} ml</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="font-bold text-slate-600 dark:text-slate-300">Glucose 10%</span>
                            <span className="font-mono font-bold text-slate-800 dark:text-white">{result.glucose} ml</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="font-bold text-slate-600 dark:text-slate-300">Lorazepam</span>
                            <span className="font-mono font-bold text-slate-800 dark:text-white">{result.lorazepam} mg</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="p-8 text-center text-slate-400 text-xs italic">
                    Enter age to calculate safety values.
                </div>
            )}
        </div>
    );
};

export default WetflagTool;
