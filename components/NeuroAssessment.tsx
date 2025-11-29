
import React, { useEffect } from 'react';
import { Brain, Eye, Activity, Zap } from 'lucide-react';
import GCSCalculator from './GCSCalculator';
import { NeuroAssessment as NeuroType } from '../types';

interface NeuroAssessmentProps {
  data: NeuroType;
  onChange: (data: NeuroType) => void;
}

const NeuroAssessment: React.FC<NeuroAssessmentProps> = ({ data, onChange }) => {
  
  const updateFast = (field: keyof NeuroType['fast'], val: any) => {
    const updatedFast = { ...data.fast, [field]: val };
    
    // Auto-calculate Positive Status
    // If any component is abnormal (Droop, Weakness, Slurred), auto-check Positive
    if (field === 'face' || field === 'arms' || field === 'speech') {
        const isPositive = updatedFast.face === 'Droop' || updatedFast.arms === 'Weakness' || updatedFast.speech === 'Slurred';
        updatedFast.testPositive = isPositive;
    }

    onChange({ ...data, fast: updatedFast });
  };

  const updatePupil = (side: 'left' | 'right', field: 'Size' | 'Reaction', val: any) => {
    onChange({
        ...data,
        pupils: { ...data.pupils, [`${side}${field}`]: val }
    });
  };

  const updateLimb = (limb: keyof NeuroType['limbs'], field: 'power' | 'sensation', val: string) => {
    onChange({
        ...data,
        limbs: { ...data.limbs, [limb]: { ...data.limbs[limb], [field]: val } }
    });
  };

  const PupilSelector = ({ side, size, reaction }: { side: 'left' | 'right', size: number, reaction: string }) => (
    <div className="flex flex-col items-center p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800">
        <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">{side === 'left' ? 'Left (L)' : 'Right (R)'}</span>
        
        {/* Size Visualizer */}
        <div className="flex gap-1 mb-3">
            {[2, 3, 4, 5, 6, 7, 8].map(s => (
                <button
                    key={s}
                    onClick={() => updatePupil(side, 'Size', s)}
                    className={`w-6 h-8 flex items-center justify-center rounded-md border transition-all ${size === s ? 'bg-ams-blue border-ams-blue ring-2 ring-ams-blue/30' : 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600'}`}
                >
                    <div className={`rounded-full bg-slate-900 dark:bg-white ${size === s ? 'bg-white dark:bg-slate-900' : ''}`} style={{ width: s*2, height: s*2 }} />
                </button>
            ))}
        </div>

        {/* Reaction Selector */}
        <div className="flex gap-1 w-full">
            {['Brisk', 'Sluggish', 'Fixed', 'None'].map(r => (
                <button
                    key={r}
                    onClick={() => updatePupil(side, 'Reaction', r)}
                    className={`flex-1 text-[10px] py-1.5 px-1 rounded-md border font-bold transition-all ${reaction === r ? 'bg-ams-blue text-white border-ams-blue' : 'bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600'}`}
                >
                    {r.substring(0, 4)}
                </button>
            ))}
        </div>
    </div>
  );

  const LimbRow = ({ label, limbKey }: { label: string, limbKey: keyof NeuroType['limbs'] }) => (
      <tr className="border-b border-slate-100 dark:border-slate-700 last:border-0">
          <td className="py-3 text-sm font-bold text-slate-700 dark:text-slate-200">{label}</td>
          <td className="py-2 pr-2">
              <select 
                className="w-full text-sm px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-ams-blue"
                value={data.limbs[limbKey].power}
                onChange={e => updateLimb(limbKey, 'power', e.target.value)}
              >
                  <option>Normal (5)</option>
                  <option>Mild Weakness (4)</option>
                  <option>Severe Weakness (3)</option>
                  <option>Movement w/ Gravity (2)</option>
                  <option>Trace Movement (1)</option>
                  <option>None (0)</option>
              </select>
          </td>
          <td className="py-2">
              <select 
                className="w-full text-sm px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-ams-blue"
                value={data.limbs[limbKey].sensation}
                onChange={e => updateLimb(limbKey, 'sensation', e.target.value)}
              >
                  <option>Normal</option>
                  <option>Reduced</option>
                  <option>Absent</option>
                  <option>Pins & Needles</option>
              </select>
          </td>
      </tr>
  );

  return (
    <div className="space-y-6">
        
        {/* GCS Section */}
        <GCSCalculator 
            value={data.gcs} 
            onChange={(val) => onChange({ ...data, gcs: val })} 
        />

        {/* Pupils */}
        <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm flex items-center gap-2 mb-3">
               <Eye className="w-4 h-4 text-ams-blue" /> Pupils (PERRLA)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PupilSelector side="left" size={data.pupils.leftSize} reaction={data.pupils.leftReaction} />
                <PupilSelector side="right" size={data.pupils.rightSize} reaction={data.pupils.rightReaction} />
            </div>
        </div>

        {/* Limbs */}
        <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm flex items-center gap-2 mb-3">
               <Activity className="w-4 h-4 text-ams-blue" /> Limb Assessment
            </h4>
            <table className="w-full">
                <thead>
                    <tr className="text-left text-xs uppercase text-slate-500 dark:text-slate-400">
                        <th className="pb-2">Limb</th>
                        <th className="pb-2">Power</th>
                        <th className="pb-2">Sensation</th>
                    </tr>
                </thead>
                <tbody>
                    <LimbRow label="Left Arm" limbKey="leftArm" />
                    <LimbRow label="Right Arm" limbKey="rightArm" />
                    <LimbRow label="Left Leg" limbKey="leftLeg" />
                    <LimbRow label="Right Leg" limbKey="rightLeg" />
                </tbody>
            </table>
        </div>

        {/* FAST Test */}
        <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm flex items-center gap-2">
                   <Zap className="w-4 h-4 text-ams-blue" /> FAST Assessment
                </h4>
                <div className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${data.fast.testPositive ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600'}`}>
                    {data.fast.testPositive ? 'POSITIVE' : 'NEGATIVE'}
                </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Face</span>
                    <select className="input-field py-2 text-xs" value={data.fast.face} onChange={e => updateFast('face', e.target.value)}>
                        <option>Normal</option><option>Droop</option>
                    </select>
                </div>
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Arms</span>
                    <select className="input-field py-2 text-xs" value={data.fast.arms} onChange={e => updateFast('arms', e.target.value)}>
                        <option>Normal</option><option>Weakness</option>
                    </select>
                </div>
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Speech</span>
                    <select className="input-field py-2 text-xs" value={data.fast.speech} onChange={e => updateFast('speech', e.target.value)}>
                        <option>Normal</option><option>Slurred</option>
                    </select>
                </div>
            </div>
            
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-end items-center">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Onset Time:</span>
                    <input type="time" className="border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 rounded p-1 text-sm dark:text-white" value={data.fast.time} onChange={e => updateFast('time', e.target.value)} />
                </div>
            </div>
        </div>
    </div>
  );
};

export default NeuroAssessment;
