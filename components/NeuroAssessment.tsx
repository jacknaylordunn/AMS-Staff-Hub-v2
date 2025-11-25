
import React from 'react';
import { Brain, Eye, Activity, Zap } from 'lucide-react';
import GCSCalculator from './GCSCalculator';
import { NeuroAssessment as NeuroType } from '../types';

interface NeuroAssessmentProps {
  data: NeuroType;
  onChange: (data: NeuroType) => void;
}

const NeuroAssessment: React.FC<NeuroAssessmentProps> = ({ data, onChange }) => {
  
  const updateFast = (field: keyof NeuroType['fast'], val: any) => {
    onChange({ ...data, fast: { ...data.fast, [field]: val } });
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
    <div className="flex flex-col items-center p-2 border border-slate-100 rounded-lg bg-white">
        <span className="text-xs font-bold uppercase text-slate-500 mb-2">{side === 'left' ? 'Left (L)' : 'Right (R)'}</span>
        
        {/* Size Visualizer */}
        <div className="flex gap-1 mb-2">
            {[2, 3, 4, 5, 6, 7, 8].map(s => (
                <button
                    key={s}
                    onClick={() => updatePupil(side, 'Size', s)}
                    className={`w-6 h-8 flex items-center justify-center rounded border transition-all ${size === s ? 'bg-ams-blue border-ams-blue' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}
                >
                    <div className={`rounded-full bg-black ${size === s ? 'bg-white' : ''}`} style={{ width: s*2, height: s*2 }} />
                </button>
            ))}
        </div>

        {/* Reaction Selector */}
        <div className="flex gap-1 w-full">
            {['Brisk', 'Sluggish', 'Fixed', 'None'].map(r => (
                <button
                    key={r}
                    onClick={() => updatePupil(side, 'Reaction', r)}
                    className={`flex-1 text-[10px] py-1 px-1 rounded border font-bold ${reaction === r ? 'bg-ams-blue text-white border-ams-blue' : 'bg-white text-slate-500 border-slate-200'}`}
                >
                    {r.substring(0, 4)}
                </button>
            ))}
        </div>
    </div>
  );

  const LimbRow = ({ label, limbKey }: { label: string, limbKey: keyof NeuroType['limbs'] }) => (
      <tr className="border-b border-slate-50 last:border-0">
          <td className="py-2 text-sm font-bold text-slate-700">{label}</td>
          <td className="py-2">
              <select 
                className="w-full text-sm p-1 border border-slate-200 rounded"
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
                className="w-full text-sm p-1 border border-slate-200 rounded"
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
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2 mb-3">
               <Eye className="w-4 h-4 text-ams-blue" /> Pupils (PERRLA)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PupilSelector side="left" size={data.pupils.leftSize} reaction={data.pupils.leftReaction} />
                <PupilSelector side="right" size={data.pupils.rightSize} reaction={data.pupils.rightReaction} />
            </div>
        </div>

        {/* Limbs */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2 mb-3">
               <Activity className="w-4 h-4 text-ams-blue" /> Limb Assessment
            </h4>
            <table className="w-full">
                <thead>
                    <tr className="text-left text-xs uppercase text-slate-500">
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
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2 mb-3">
               <Zap className="w-4 h-4 text-ams-blue" /> FAST Assessment
            </h4>
            <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="flex flex-col">
                    <span className="text-xs font-medium text-slate-500">Face</span>
                    <select className="border border-slate-200 rounded p-1 text-sm" value={data.fast.face} onChange={e => updateFast('face', e.target.value)}>
                        <option>Normal</option><option>Droop</option>
                    </select>
                </div>
                <div className="flex flex-col">
                    <span className="text-xs font-medium text-slate-500">Arms</span>
                    <select className="border border-slate-200 rounded p-1 text-sm" value={data.fast.arms} onChange={e => updateFast('arms', e.target.value)}>
                        <option>Normal</option><option>Weakness</option>
                    </select>
                </div>
                <div className="flex flex-col">
                    <span className="text-xs font-medium text-slate-500">Speech</span>
                    <select className="border border-slate-200 rounded p-1 text-sm" value={data.fast.speech} onChange={e => updateFast('speech', e.target.value)}>
                        <option>Normal</option><option>Slurred</option>
                    </select>
                </div>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                <label className="flex items-center gap-2 text-sm font-bold text-red-600">
                    <input type="checkbox" checked={data.fast.testPositive} onChange={e => updateFast('testPositive', e.target.checked)} className="w-4 h-4" />
                    FAST Positive
                </label>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Onset:</span>
                    <input type="time" className="border border-slate-200 rounded p-1 text-sm w-24" value={data.fast.time} onChange={e => updateFast('time', e.target.value)} />
                </div>
            </div>
        </div>
    </div>
  );
};

export default NeuroAssessment;
