
import React from 'react';
import { Eye, Activity } from 'lucide-react';
import { CranialNerveStatus } from '../types';

interface CranialNerveAssessmentProps {
  data: CranialNerveStatus[];
  onChange: (data: CranialNerveStatus[]) => void;
}

const NERVES = [
    { id: 'II', name: 'Optic', test: 'Visual Acuity, Visual Fields' },
    { id: 'III', name: 'Occulomotor', test: 'Eyelid/Pupil Constrictor/Orbital Muscles' },
    { id: 'IV', name: 'Trochlear', test: 'Superior Oblique (Eye down & in)' },
    { id: 'V', name: 'Trigeminal', test: 'Facial Sensation, Jaw Clench' },
    { id: 'VI', name: 'Abductens', test: 'Lateral Rectus (Eye lateral)' },
    { id: 'VII', name: 'Facial', test: 'Facial Muscle Symmetry (Smile/Frown)' },
    { id: 'VIII', name: 'Vestibulocochlear', test: 'Balance & Hearing' },
];

const CranialNerveAssessment: React.FC<CranialNerveAssessmentProps> = ({ data = [], onChange }) => {
  
  // Initialize if empty
  React.useEffect(() => {
      if (data.length === 0) {
          const init = NERVES.map(n => ({
              nerve: `${n.id} - ${n.name}`,
              test: n.test,
              status: 'Not Tested' as const,
              notes: ''
          }));
          onChange(init);
      }
  }, []);

  const updateStatus = (index: number, status: 'Normal' | 'Abnormal') => {
      const newData = [...data];
      // Toggle logic: if clicking same status, reset to Not Tested
      newData[index].status = newData[index].status === status ? 'Not Tested' : status;
      onChange(newData);
  };

  const updateNotes = (index: number, val: string) => {
      const newData = [...data];
      newData[index].notes = val;
      onChange(newData);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Eye className="w-5 h-5 text-ams-blue" /> Cranial Nerve Assessment
            </h4>
            <div className="text-xs text-slate-500">Tap to toggle</div>
        </div>
        
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.map((item, idx) => (
                <div key={idx} className="p-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex-1">
                            <div className="font-bold text-sm text-slate-800 dark:text-white">{item.nerve}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.test}</div>
                        </div>
                        
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex-shrink-0">
                            <button 
                                onClick={() => updateStatus(idx, 'Normal')}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${item.status === 'Normal' ? 'bg-green-500 text-white shadow-sm' : 'text-slate-500 hover:text-green-600'}`}
                            >
                                Normal
                            </button>
                            <button 
                                onClick={() => updateStatus(idx, 'Abnormal')}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${item.status === 'Abnormal' ? 'bg-red-500 text-white shadow-sm' : 'text-slate-500 hover:text-red-600'}`}
                            >
                                Abnormal
                            </button>
                        </div>
                    </div>
                    
                    {item.status === 'Abnormal' && (
                        <div className="mt-2 animate-in slide-in-from-top-1">
                            <input 
                                className="w-full bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg px-3 py-2 text-xs text-red-800 dark:text-red-200 outline-none placeholder-red-300"
                                placeholder="Describe abnormality (e.g. Left sided weakness, nystagmus)..."
                                value={item.notes}
                                onChange={e => updateNotes(idx, e.target.value)}
                            />
                        </div>
                    )}
                </div>
            ))}
        </div>
    </div>
  );
};

export default CranialNerveAssessment;
