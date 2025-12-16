
import React from 'react';
import { PersonStanding, Armchair, HelpCircle } from 'lucide-react';

interface ClinicalFrailtyScaleProps {
  value?: number; // Made optional
  onChange: (value: number) => void;
}

const ClinicalFrailtyScale: React.FC<ClinicalFrailtyScaleProps> = ({ value, onChange }) => {
  const levels = [
    { score: 1, title: 'Very Fit', desc: 'Robust, active, energetic and motivated. Top 5% of age group.', color: 'bg-green-100 border-green-200 text-green-800' },
    { score: 2, title: 'Well', desc: 'No active disease symptoms but less fit than category 1. Occasional seasonal exercise.', color: 'bg-green-50 border-green-200 text-green-700' },
    { score: 3, title: 'Managing Well', desc: 'Medical problems well controlled, but not regularly active beyond routine walking.', color: 'bg-blue-50 border-blue-200 text-blue-700' },
    { score: 4, title: 'Vulnerable', desc: 'Not dependent but symptoms limit activities. "Slowed up" or overtired during day.', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
    { score: 5, title: 'Mildly Frail', desc: 'More evident slowing. Need help with high-order IADLs (finances, transport, heavy housework).', color: 'bg-amber-50 border-amber-200 text-amber-700' },
    { score: 6, title: 'Moderately Frail', desc: 'Need help with all outside activities and keeping house. Problems with stairs/bathing.', color: 'bg-orange-50 border-orange-200 text-orange-700' },
    { score: 7, title: 'Severely Frail', desc: 'Completely dependent for personal care. Physical or cognitive impairment. Stable.', color: 'bg-red-50 border-red-200 text-red-700' },
    { score: 8, title: 'Very Severely Frail', desc: 'Completely dependent, approaching end of life. Could not recover from even minor illness.', color: 'bg-red-100 border-red-300 text-red-800' },
    { score: 9, title: 'Terminally Ill', desc: 'Approaching the end of life. Life expectancy < 6 months.', color: 'bg-purple-100 border-purple-200 text-purple-800' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {levels.map((level) => (
        <button
          key={level.score}
          onClick={() => onChange(level.score)}
          className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all ${
            value === level.score 
              ? `${level.color} ring-2 ring-offset-1 ring-slate-400 shadow-md transform scale-[1.02]` 
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          <div className="flex justify-between w-full mb-2">
            <span className={`text-xl font-bold ${value === level.score ? '' : 'text-slate-700 dark:text-white'}`}>{level.score}</span>
            {value === level.score && <div className="w-3 h-3 rounded-full bg-current animate-pulse"></div>}
          </div>
          <h4 className={`font-bold text-sm mb-1 ${value === level.score ? '' : 'text-slate-800 dark:text-slate-200'}`}>{level.title}</h4>
          <p className={`text-xs leading-relaxed ${value === level.score ? 'opacity-90' : 'text-slate-500 dark:text-slate-400'}`}>{level.desc}</p>
        </button>
      ))}
    </div>
  );
};

export default ClinicalFrailtyScale;
