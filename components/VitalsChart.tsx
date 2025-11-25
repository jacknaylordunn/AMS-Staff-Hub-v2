
import React from 'react';
import { VitalsEntry } from '../types';

interface VitalsChartProps {
  data: VitalsEntry[];
}

const VitalsChart: React.FC<VitalsChartProps> = ({ data }) => {
  if (data.length < 2) {
    return (
      <div className="h-64 flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-slate-200 border-dashed text-slate-400 text-sm gap-2">
        <svg className="w-10 h-10 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
        <span className="font-medium">Add at least two sets of vitals to visualize trends.</span>
      </div>
    );
  }

  const width = 800;
  const height = 250;
  const padding = 40;

  // Scales
  const xStep = (width - padding * 2) / (data.length - 1);
  const maxHR = Math.max(...data.map(d => d.hr), 140);
  const minHR = Math.min(...data.map(d => d.hr), 40);
  const hrRange = maxHR - minHR || 1;

  // Create curved path command (Catmull-Rom or simplified quadratic bezier for smooth lines)
  // For simplicity in raw SVG without d3, we'll use standard polylines but smoothed visually via CSS if possible, 
  // or manually calculate control points. Here we stick to straight lines for accuracy but style them better.
  
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
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
      <div className="min-w-[800px] p-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          {/* Grid Lines & Y-Axis Labels */}
          {[0, 0.25, 0.5, 0.75, 1].map(t => {
             const y = padding + t * (height - 2*padding);
             return (
               <g key={t}>
                  <line x1={padding} y1={y} x2={width-padding} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                  <text x={padding - 10} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8" fontWeight="bold" fontFamily="Inter">
                      {Math.round(maxHR - t * hrRange)}
                  </text>
               </g>
             );
          })}
          
          {/* Gradients */}
          <defs>
            <linearGradient id="spo2Gradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2"/>
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/>
            </linearGradient>
            <linearGradient id="hrGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.1"/>
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0"/>
            </linearGradient>
          </defs>

          {/* SpO2 Fill */}
          <path d={`M${padding},${height-padding} ${spo2Points.replace(/,/g, ' ')} L${width-padding},${height-padding} Z`} fill="url(#spo2Gradient)" />
          
          {/* HR Fill (Subtle) */}
          <path d={`M${padding},${height-padding} ${hrPoints.replace(/,/g, ' ')} L${width-padding},${height-padding} Z`} fill="url(#hrGradient)" />

          {/* SpO2 Line */}
          <polyline points={spo2Points} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* HR Line */}
          <polyline points={hrPoints} fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          
          {/* Data Points */}
          {data.map((d, i) => {
             const x = padding + i * xStep;
             const yHR = height - padding - ((d.hr - minHR) / hrRange) * (height - padding * 2);
             const ySpo2 = height - padding - ((d.spo2 - 80) / 20) * (height - padding * 2);
             
             return (
                 <g key={`pt-${i}`}>
                     {/* HR Point */}
                     <circle cx={x} cy={yHR} r="6" fill="white" stroke="#ef4444" strokeWidth="3" />
                     <text x={x} y={yHR - 12} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#ef4444">{d.hr}</text>
                     
                     {/* SpO2 Point */}
                     <circle cx={x} cy={ySpo2} r="4" fill="#3b82f6" stroke="white" strokeWidth="2" />
                 </g>
             );
          })}

          {/* Legend */}
          <g transform={`translate(${width - 160}, 10)`}>
              <rect width="150" height="60" rx="8" fill="white" stroke="#e2e8f0" strokeWidth="1" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.05))" />
              
              <circle cx="20" cy="20" r="4" fill="#ef4444" />
              <text x="35" y="24" fontSize="11" fontWeight="bold" fill="#334155" fontFamily="Inter">Heart Rate (BPM)</text>
              
              <circle cx="20" cy="40" r="4" fill="#3b82f6" />
              <text x="35" y="44" fontSize="11" fontWeight="bold" fill="#334155" fontFamily="Inter">SpO2 (%)</text>
          </g>

          {/* Time Axis */}
          {data.map((d, i) => {
             const x = padding + i * xStep;
             return (
                 <text key={`time-${i}`} x={x} y={height - 10} textAnchor="middle" fontSize="10" fill="#64748b" fontWeight="bold" fontFamily="JetBrains Mono">
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
