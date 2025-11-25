
import React, { useState, useEffect } from 'react';
import { Calculator } from 'lucide-react';

interface GCSCalculatorProps {
  value: { eyes: number; verbal: number; motor: number; total: number };
  onChange: (val: { eyes: number; verbal: number; motor: number; total: number }) => void;
}

const GCSCalculator: React.FC<GCSCalculatorProps> = ({ value, onChange }) => {
  const [localScore, setLocalScore] = useState(value);

  useEffect(() => {
    setLocalScore(value);
  }, [value]);

  const updateScore = (type: 'eyes' | 'verbal' | 'motor', score: number) => {
    const newScore = { ...localScore, [type]: score };
    newScore.total = newScore.eyes + newScore.verbal + newScore.motor;
    setLocalScore(newScore);
    onChange(newScore);
  };

  const Option = ({ type, score, label }: { type: 'eyes' | 'verbal' | 'motor', score: number, label: string }) => (
    <button
      type="button"
      onClick={() => updateScore(type, score)}
      className={`px-2 py-1.5 text-xs rounded border transition-colors text-left truncate ${
        localScore[type] === score 
        ? 'bg-ams-blue text-white border-ams-blue font-bold shadow-sm' 
        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
      }`}
    >
      <span className="font-bold mr-1">{score}</span> {label}
    </button>
  );

  return (
    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
       <div className="flex justify-between items-center border-b border-slate-200 pb-2">
           <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2">
               <Calculator className="w-4 h-4 text-ams-blue" /> GCS Calculator
           </h4>
           <div className="text-xl font-bold bg-white px-3 py-1 rounded border border-slate-200">
               {localScore.total}<span className="text-xs text-slate-400">/15</span>
           </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <div className="flex flex-col gap-1">
               <span className="text-xs font-bold text-slate-500 uppercase mb-1">Eyes (4)</span>
               <Option type="eyes" score={4} label="Spontaneous" />
               <Option type="eyes" score={3} label="To Sound" />
               <Option type="eyes" score={2} label="To Pressure" />
               <Option type="eyes" score={1} label="None" />
           </div>
           <div className="flex flex-col gap-1">
               <span className="text-xs font-bold text-slate-500 uppercase mb-1">Verbal (5)</span>
               <Option type="verbal" score={5} label="Oriented" />
               <Option type="verbal" score={4} label="Confused" />
               <Option type="verbal" score={3} label="Words" />
               <Option type="verbal" score={2} label="Sounds" />
               <Option type="verbal" score={1} label="None" />
           </div>
           <div className="flex flex-col gap-1">
               <span className="text-xs font-bold text-slate-500 uppercase mb-1">Motor (6)</span>
               <Option type="motor" score={6} label="Obey Cmds" />
               <Option type="motor" score={5} label="Localising" />
               <Option type="motor" score={4} label="Flexion (N)" />
               <Option type="motor" score={3} label="Flexion (Ab)" />
               <Option type="motor" score={2} label="Extension" />
               <Option type="motor" score={1} label="None" />
           </div>
       </div>
    </div>
  );
};

export default GCSCalculator;
