
import React from 'react';
import { VitalsEntry } from '../types';

interface VitalsChartProps {
  data: VitalsEntry[];
}

const VitalsChart: React.FC<VitalsChartProps> = ({ data }) => {
  if (data.length < 2) {
    return (
      <div className="h-64 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 border-dashed text-slate-400 text-sm gap-2">
        <span className="font-medium">Add at least two sets of vitals to visualize trends.</span>
      </div>
    );
  }

  const width = 800;
  const height = 250;
  const padding = 40;

  const xStep = (width - padding * 2) / (data.length - 1);
  const maxHR = Math.max(...data.map(d => d.hr), 140);
  const minHR = Math.min(...data.map(d => d.hr), 40);
  const hrRange = maxHR - minHR || 1;

  const hrPoints = data.map((d, i) => {
    const x = padding + i * xStep;
    const y = height - padding - ((d.hr - minHR) / hrRange) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  const spo2Points = data.map((d, i) => {
    const x = padding + i * xStep;
    const y = height - padding - ((d.spo2 - 80) / 20) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-900">
      <div className="min-w-[800px] p-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          {[0, 0.25, 0.5, 0.75, 1].map(t => {
             const y = padding + t * (height - 2*padding);
             return (
               <g key={t}>
                  <line x1={padding} y1={y} x2={width-padding} y2={y} stroke="#475569" strokeWidth="0.5" strokeDasharray="4" />
                  <text x={padding - 10} y={y + 4} textAnchor="end" fontSize="10" className="fill-slate-400 dark:fill-slate-500" fontWeight="bold">
                      {Math.round(maxHR - t * hrRange)}
                  </text>
               </g>
             );
          })}
          
          <path d={`M${padding},${height-padding} ${spo2Points.replace(/,/g, ' ')} L${width-padding},${height-padding} Z`} fill="rgba(59, 130, 246, 0.1)" />
          <path d={`M${padding},${height-padding} ${hrPoints.replace(/,/g, ' ')} L${width-padding},${height-padding} Z`} fill="rgba(239, 68, 68, 0.1)" />

          <polyline points={spo2Points} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={hrPoints} fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          
          {data.map((d, i) => {
             const x = padding + i * xStep;
             const yHR = height - padding - ((d.hr - minHR) / hrRange) * (height - padding * 2);
             const ySpo2 = height - padding - ((d.spo2 - 80) / 20) * (height - padding * 2);
             return (
                 <g key={`pt-${i}`}>
                     <circle cx={x} cy={yHR} r="4" fill="#ef4444" stroke="#fff" strokeWidth="1" />
                     <text x={x} y={yHR - 12} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#ef4444">{d.hr}</text>
                     <circle cx={x} cy={ySpo2} r="4" fill="#3b82f6" stroke="#fff" strokeWidth="1" />
                 </g>
             );
          })}

          <g transform={`translate(${width - 160}, 10)`}>
              <rect width="150" height="60" rx="8" fill="transparent" stroke="#475569" strokeWidth="1" />
              <circle cx="20" cy="20" r="4" fill="#ef4444" />
              <text x="35" y="24" fontSize="11" fontWeight="bold" className="fill-slate-400 dark:fill-slate-500">Heart Rate (BPM)</text>
              <circle cx="20" cy="40" r="4" fill="#3b82f6" />
              <text x="35" y="44" fontSize="11" fontWeight="bold" className="fill-slate-400 dark:fill-slate-500">SpO2 (%)</text>
          </g>

          {data.map((d, i) => {
             const x = padding + i * xStep;
             return (
                 <text key={`time-${i}`} x={x} y={height - 10} textAnchor="middle" fontSize="10" className="fill-slate-400 dark:fill-slate-500" fontWeight="bold">
                     {d.time}
                 </text>
             );
          })}
        </svg>
      </div>
    </div>
  );
};

export default VitalsChart;
