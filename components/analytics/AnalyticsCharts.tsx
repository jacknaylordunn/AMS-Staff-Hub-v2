import React from 'react';

export const BarChart = ({ data, color, height = 200 }: any) => {
    if (!data || data.length === 0) return null;
    const maxVal = Math.max(...data.map((d: any) => d.value));

    return (
        <div className="flex items-end gap-2" style={{ height }}>
            {data.map((item: any, idx: number) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                    <div 
                        className="w-full rounded-t-lg transition-all relative group-hover:opacity-80"
                        style={{ 
                            height: `${(item.value / maxVal) * 100}%`, 
                            backgroundColor: item.color || color 
                        }}
                    >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                            {item.label}: {item.value}
                        </div>
                    </div>
                    <span className="text-[10px] text-slate-500 font-bold truncate w-full text-center dark:text-slate-400">{item.label}</span>
                </div>
            ))}
        </div>
    );
};

export const HorizontalBarChart = ({ data, color }: any) => {
    if (!data || data.length === 0) return null;
    const maxVal = Math.max(...data.map((d: any) => d.value));

    return (
        <div className="space-y-3">
            {data.map((item: any, idx: number) => (
                <div key={idx} className="group">
                    <div className="flex justify-between text-xs mb-1">
                        <span className="font-bold text-slate-700 dark:text-slate-300">{item.label}</span>
                        <span className="text-slate-500">{item.value}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                        <div 
                            className="h-2.5 rounded-full transition-all group-hover:opacity-80" 
                            style={{ 
                                width: `${(item.value / maxVal) * 100}%`, 
                                backgroundColor: item.color || color 
                            }}
                        ></div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export const DonutChart = ({ data, size = 160 }: any) => {
    if (!data || data.length === 0) return null;
    const total = data.reduce((a: number, c: any) => a + c.value, 0);
    
    let currentAngle = 0;
    const slices = data.map((item: any) => {
        const percentage = (item.value / total) * 100;
        const angle = (item.value / total) * 360;
        
        const r = 50;
        const cx = 50;
        const cy = 50;
        
        const x1 = cx + r * Math.cos(Math.PI * currentAngle / 180);
        const y1 = cy + r * Math.sin(Math.PI * currentAngle / 180);
        
        const x2 = cx + r * Math.cos(Math.PI * (currentAngle + angle) / 180);
        const y2 = cy + r * Math.sin(Math.PI * (currentAngle + angle) / 180);
        
        const largeArc = angle > 180 ? 1 : 0;
        
        const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
        
        const slice = { pathData, color: item.color, percent: Math.round(percentage), value: item.value, label: item.label };
        currentAngle += angle;
        return slice;
    });

    return (
        <div className="flex items-center gap-6">
            <div className="relative" style={{ width: size, height: size }}>
                <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
                    {slices.map((slice: any, idx: number) => (
                        <path 
                            key={idx} 
                            d={slice.pathData} 
                            fill={slice.color} 
                            stroke="white" 
                            strokeWidth="1"
                            className="hover:opacity-90 transition-opacity dark:stroke-slate-800"
                        >
                            <title>{slice.label}: {slice.value} ({slice.percent}%)</title>
                        </path>
                    ))}
                    <circle cx="50" cy="50" r="30" className="fill-white dark:fill-slate-800" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold text-slate-800 dark:text-white">{total}</span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Total</span>
                </div>
            </div>
            
            <div className="flex-1 space-y-2">
                {data.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                            <span className="font-medium text-slate-600 dark:text-slate-300">{item.label}:</span>
                        </div>
                        <span className="font-bold text-slate-800 dark:text-white pl-2">{item.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};