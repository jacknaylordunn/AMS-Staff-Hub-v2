
import React, { useEffect, useState } from 'react';
import { AlertTriangle, Radio } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

const MajorIncidentBanner = () => {
  const [activeIncident, setActiveIncident] = useState<any | null>(null);

  useEffect(() => {
    // Listen to the singleton document for major incidents
    const unsub = onSnapshot(doc(db, 'system', 'majorIncident'), (doc) => {
      if (doc.exists() && doc.data().active) {
        setActiveIncident(doc.data());
      } else {
        setActiveIncident(null);
      }
    });

    return () => unsub();
  }, []);

  if (!activeIncident) return null;

  return (
    <div className="bg-red-600 text-white px-4 py-3 shadow-md animate-pulse sticky top-0 z-[60]">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-full animate-bounce">
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg leading-tight uppercase tracking-wider">
              MAJOR INCIDENT DECLARED
            </h3>
            <p className="text-xs text-red-100 font-mono">
              {activeIncident.type || 'Unknown Type'} • {activeIncident.location || 'Unknown Location'}
            </p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-black/20 rounded text-xs font-bold">
                <Radio className="w-4 h-4" />
                METHANE ACTIVE
            </div>
            <a href="/#/major-incident" className="px-4 py-2 bg-white text-red-600 text-xs font-bold rounded-lg shadow-sm hover:bg-red-50 transition-colors uppercase">
                View & Check-In
            </a>
        </div>
      </div>
    </div>
  );
};

export default MajorIncidentBanner;
