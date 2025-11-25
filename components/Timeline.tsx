
import React from 'react';
import { Clock, Activity, Pill, AlertTriangle, FileText, CheckCircle, MessageSquare, Coffee } from 'lucide-react';
import { EPRF } from '../types';

interface TimelineProps {
  data: EPRF;
}

const Timeline: React.FC<TimelineProps> = ({ data }) => {
  // Aggregate all events
  const events: any[] = [];

  // 1. Times
  if (data.times.callReceived) events.push({ time: data.times.callReceived, type: 'System', label: 'Call Received', icon: Clock, color: 'text-slate-500 bg-slate-100' });
  if (data.times.mobile) events.push({ time: data.times.mobile, type: 'System', label: 'Mobile', icon: Clock, color: 'text-slate-500 bg-slate-100' });
  if (data.times.onScene) events.push({ time: data.times.onScene, type: 'System', label: 'On Scene', icon: Clock, color: 'text-green-600 bg-green-100' });
  if (data.times.patientContact) events.push({ time: data.times.patientContact, type: 'System', label: 'Patient Contact', icon: CheckCircle, color: 'text-green-600 bg-green-100' });

  // 2. Vitals
  data.vitals.forEach(v => {
      events.push({
          time: v.time,
          type: 'Clinical',
          label: `Vitals Taken (NEWS2: ${v.news2Score})`,
          details: `BP: ${v.bpSystolic}/${v.bpDiastolic} | HR: ${v.hr} | SpO2: ${v.spo2}%`,
          icon: Activity,
          color: 'text-blue-600 bg-blue-100'
      });
  });

  // 3. Drugs
  data.treatments.drugs.forEach(d => {
      events.push({
          time: d.time,
          type: 'Clinical',
          label: `Drug Administered: ${d.drugName}`,
          details: `${d.dose} via ${d.route} (${d.administeredBy})`,
          icon: Pill,
          color: 'text-purple-600 bg-purple-100'
      });
  });

  // 4. Logs
  if (data.logs) {
      data.logs.forEach(l => {
          events.push({
              time: l.timestamp.split('T')[1]?.substring(0,5) || '00:00',
              type: l.category === 'Clinical' ? 'Observation' : 'Log',
              label: l.category === 'Clinical' ? 'Welfare Check' : `${l.category} Log`,
              details: l.message,
              icon: l.category === 'Clinical' ? Coffee : MessageSquare,
              color: l.category === 'Clinical' ? 'text-amber-600 bg-amber-100' : 'text-slate-600 bg-slate-100'
          });
      });
  }

  // Sort by time
  events.sort((a, b) => a.time.localeCompare(b.time));

  if (events.length === 0) {
      return <div className="p-8 text-center text-slate-400 italic">No timeline events recorded yet.</div>;
  }

  return (
    <div className="relative border-l-2 border-slate-200 ml-4 space-y-6 py-2">
        {events.map((event, idx) => (
            <div key={idx} className="relative pl-6">
                <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${event.color.replace('text-', 'bg-').split(' ')[0]}`}></div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-bold text-slate-400 font-mono">{event.time}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${event.color}`}>
                        {event.type}
                    </span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <event.icon className="w-4 h-4 text-slate-400" />
                        {event.label}
                    </h4>
                    {event.details && (
                        <p className="text-xs text-slate-600 mt-1 ml-6">{event.details}</p>
                    )}
                </div>
            </div>
        ))}
    </div>
  );
};

export default Timeline;
