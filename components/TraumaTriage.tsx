
import React, { useEffect } from 'react';
import { AlertOctagon, CheckSquare, Square } from 'lucide-react';
import { TraumaTriageResult } from '../types';

interface TraumaTriageProps {
  value?: TraumaTriageResult;
  onChange: (res: TraumaTriageResult) => void;
}

const TraumaTriage: React.FC<TraumaTriageProps> = ({ value, onChange }) => {
    
  const data = value || {
      physiology: false,
      anatomy: false,
      mechanism: false,
      special: false,
      isMajorTrauma: false,
      criteria: []
  };

  const toggleCriterion = (category: keyof TraumaTriageResult, item: string) => {
      const currentCriteria = data.criteria || [];
      const exists = currentCriteria.includes(item);
      const newCriteria = exists 
        ? currentCriteria.filter(c => c !== item)
        : [...currentCriteria, item];
      
      const categoryHasItems = newCriteria.some(c => 
          category === 'physiology' ? PHYSIOLOGY.includes(c) :
          category === 'anatomy' ? ANATOMY.includes(c) :
          category === 'mechanism' ? MECHANISM.includes(c) :
          SPECIAL.includes(c)
      );

      const newData = {
          ...data,
          criteria: newCriteria,
          [category]: categoryHasItems
      };
      
      // Auto-calculate Major Trauma Status
      // Generally: Any Physiology OR Anatomy = Major Trauma. Mechanism usually requires advice/assessment.
      // For this simplified tool: Phys OR Anat = Positive.
      newData.isMajorTrauma = newData.physiology || newData.anatomy;

      onChange(newData);
  };

  const PHYSIOLOGY = [
      'GCS < 14',
      'Systolic BP < 90mmHg',
      'Respiratory Rate < 10 or > 29',
      'Heart Rate > 120 (Adult)'
  ];

  const ANATOMY = [
      'Penetrating injury (Head/Neck/Torso)',
      'Chest Flail / Open Chest',
      'Two or more proximal long bone #',
      'Pelvic Fracture',
      'Amputation proximal to wrist/ankle',
      'Paralysis / Spinal Injury',
      'Open/Depressed Skull #'
  ];

  const MECHANISM = [
      'Fall > 3m (Adult) or > 2x Height (Child)',
      'High Speed MVC / Ejection',
      'Pedestrian/Cyclist hit > 30kph',
      'Death in same vehicle'
  ];

  const SPECIAL = [
      'Age > 55 or < 5',
      'Pregnancy > 20 weeks',
      'Bleeding Disorder / Anticoagulants'
  ];

  const Section = ({ title, items, cat }: { title: string, items: string[], cat: keyof TraumaTriageResult }) => (
      <div className="mb-4">
          <h5 className={`font-bold text-xs uppercase mb-2 flex items-center gap-2 ${data[cat] ? 'text-red-600' : 'text-slate-500'}`}>
             {data[cat] ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />} {title}
          </h5>
          <div className="space-y-2">
              {items.map(item => (
                  <button
                    key={item}
                    onClick={() => toggleCriterion(cat, item)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition-all ${
                        data.criteria.includes(item)
                        ? 'bg-red-50 border-red-200 text-red-700 font-medium'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                      {item}
                  </button>
              ))}
          </div>
      </div>
  );

  return (
    <div className={`border rounded-xl p-4 transition-colors ${data.isMajorTrauma ? 'bg-red-50 border-red-300' : 'bg-slate-50 border-slate-200'}`}>
        <div className="flex justify-between items-start mb-4 border-b border-black/5 pb-4">
            <div>
                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                    <AlertOctagon className={`w-5 h-5 ${data.isMajorTrauma ? 'text-red-600' : 'text-slate-400'}`} />
                    Trauma Triage Tool
                </h4>
                <p className="text-xs text-slate-500">Pathfinder Major Trauma Protocol</p>
            </div>
            <div className={`px-3 py-1 rounded-lg font-bold text-sm ${data.isMajorTrauma ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                {data.isMajorTrauma ? 'MAJOR TRAUMA' : 'NEGATIVE'}
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <Section title="Physiology (Step 1)" items={PHYSIOLOGY} cat="physiology" />
                <Section title="Anatomy (Step 2)" items={ANATOMY} cat="anatomy" />
            </div>
            <div>
                <Section title="Mechanism (Step 3)" items={MECHANISM} cat="mechanism" />
                <Section title="Special Considerations" items={SPECIAL} cat="special" />
            </div>
        </div>
    </div>
  );
};

export default TraumaTriage;
