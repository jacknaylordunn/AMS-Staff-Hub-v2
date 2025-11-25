
import React, { useRef, useEffect, useState } from 'react';
import { Eraser, RefreshCcw, Circle, AlertCircle, Zap, Activity, Square, Info, X } from 'lucide-react';
import { InjuryMark } from '../types';

const ANTERIOR_URL = "https://145955222.fs1.hubspotusercontent-eu1.net/hubfs/145955222/AMS/Staff%20Hub/Body%20Map%20-%20Front.jpeg";
const POSTERIOR_URL = "https://145955222.fs1.hubspotusercontent-eu1.net/hubfs/145955222/AMS/Staff%20Hub/Body%20Map%20-%20Back.jpeg";

interface BodyMapProps {
    value: InjuryMark[];
    onChange: (marks: InjuryMark[]) => void;
}

type ToolType = 'Wound' | 'Fracture' | 'Burn' | 'Bruise' | 'Pain' | 'Intervention';

const BodyMap: React.FC<BodyMapProps> = ({ value = [], onChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<'Anterior' | 'Posterior'>('Anterior');
  const [activeTool, setActiveTool] = useState<ToolType>('Wound');
  const [selectedMark, setSelectedMark] = useState<InjuryMark | null>(null);
  const [noteInput, setNoteInput] = useState('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle High DPI
    const dpr = window.devicePixelRatio || 1;
    const width = 300;
    const height = 600;
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    
    ctx.scale(dpr, dpr);

    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = view === 'Anterior' ? ANTERIOR_URL : POSTERIOR_URL;
    
    img.onload = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      
      // Draw existing markings for this view
      value.filter(i => i.view === view).forEach(mark => {
        ctx.beginPath();
        const color = getCategoryColor(mark.type);
        ctx.fillStyle = color;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;

        if (mark.type === 'Fracture') {
            ctx.moveTo(mark.x - 6, mark.y - 6);
            ctx.lineTo(mark.x + 6, mark.y + 6);
            ctx.moveTo(mark.x + 6, mark.y - 6);
            ctx.lineTo(mark.x - 6, mark.y + 6);
            ctx.strokeStyle = color;
            ctx.stroke();
        } else if (mark.type === 'Intervention') {
            ctx.rect(mark.x - 5, mark.y - 5, 10, 10);
            ctx.fill();
            ctx.stroke();
        } else {
            ctx.arc(mark.x, mark.y, 6, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
        }
        
        if (mark.notes) {
            ctx.beginPath();
            ctx.fillStyle = '#22c55e';
            ctx.arc(mark.x + 6, mark.y - 6, 3, 0, 2 * Math.PI);
            ctx.fill();
        }
      });
    };
  }, [view, value]);

  const getCategoryColor = (type: string) => {
      switch(type) {
          case 'Wound': return '#EF4444';
          case 'Fracture': return '#F59E0B';
          case 'Burn': return '#000000';
          case 'Bruise': return '#8B5CF6';
          case 'Pain': return '#FCD34D';
          case 'Intervention': return '#3B82F6';
          default: return '#EF4444';
      }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clickedMark = value.find(m => 
        m.view === view && 
        Math.abs(m.x - x) < 15 && 
        Math.abs(m.y - y) < 15
    );

    if (clickedMark) {
        setSelectedMark(clickedMark);
        setNoteInput(clickedMark.notes || '');
        return;
    }

    const newInjury: InjuryMark = {
        id: Date.now().toString(),
        x,
        y,
        view,
        type: activeTool,
    };
    onChange([...value, newInjury]);
  };

  const updateMarkNote = () => {
      if (!selectedMark) return;
      const updated = value.map(m => m.id === selectedMark.id ? { ...m, notes: noteInput } : m);
      onChange(updated);
      setSelectedMark(null);
  };

  const deleteMark = () => {
      if (!selectedMark) return;
      onChange(value.filter(m => m.id !== selectedMark.id));
      setSelectedMark(null);
  };

  const ToolButton = ({ tool, label, icon: Icon, color }: any) => (
      <button 
        onClick={() => setActiveTool(tool)}
        className={`flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-bold transition-all w-16 h-16 ${
            activeTool === tool 
            ? 'bg-slate-800 text-white shadow-lg scale-105 ring-2 ring-slate-300 ring-offset-1' 
            : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
        }`}
      >
          <Icon className="w-5 h-5 mb-1" style={{ color: activeTool === tool ? '#fff' : color }} />
          {label}
      </button>
  );

  return (
    <div className="flex flex-col items-center gap-4 w-full relative">
      <div className="flex justify-between w-full max-w-[300px]">
          <button 
            onClick={() => setView(view === 'Anterior' ? 'Posterior' : 'Anterior')}
            className="flex items-center gap-2 px-6 py-3 bg-ams-blue text-white rounded-xl shadow-md text-sm font-bold w-full justify-center hover:bg-blue-800 transition-colors"
          >
            <RefreshCcw className="w-4 h-4" />
            {view === 'Anterior' ? 'Front View' : 'Back View'}
          </button>
      </div>

      <div className="flex flex-wrap gap-2 justify-center max-w-[320px]">
         <ToolButton tool="Wound" label="Wound" icon={Circle} color="#EF4444" />
         <ToolButton tool="Fracture" label="Fracture" icon={AlertCircle} color="#F59E0B" />
         <ToolButton tool="Burn" label="Burn" icon={Zap} color="#000000" />
         <ToolButton tool="Bruise" label="Bruise" icon={Circle} color="#8B5CF6" />
         <ToolButton tool="Pain" label="Pain" icon={Activity} color="#FCD34D" />
         <ToolButton tool="Intervention" label="IV/Int" icon={Square} color="#3B82F6" />
      </div>

      <div className="relative border-4 border-slate-200 rounded-2xl overflow-hidden bg-slate-100 shadow-inner select-none" ref={containerRef}>
        <canvas
            ref={canvasRef}
            className="cursor-crosshair touch-none block"
            onClick={handleCanvasClick}
        />
        <div className="absolute bottom-3 left-0 right-0 text-center pointer-events-none">
            <span className="px-4 py-1.5 bg-black/60 text-white rounded-full text-xs backdrop-blur-md font-bold uppercase tracking-wider">
                {view}
            </span>
        </div>
      </div>

      {selectedMark && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-4 backdrop-blur-sm bg-black/10">
              <div className="bg-white p-5 rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xs animate-in zoom-in duration-200">
                  <div className="flex justify-between items-center mb-4">
                      <h4 className="font-bold text-slate-800 flex items-center gap-2">
                          <Info className="w-4 h-4 text-ams-blue" /> Edit Details
                      </h4>
                      <button onClick={() => setSelectedMark(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getCategoryColor(selectedMark.type) }}></span>
                      <p className="text-sm text-slate-600 font-bold">{selectedMark.type} on {selectedMark.view}</p>
                  </div>
                  <textarea 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-ams-blue mb-4 resize-none"
                    rows={3}
                    placeholder="Describe injury (size, depth...)"
                    value={noteInput}
                    onChange={e => setNoteInput(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-2">
                      <button onClick={deleteMark} className="px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-bold flex-1 hover:bg-red-100 transition-colors">Delete</button>
                      <button onClick={updateMarkNote} className="px-4 py-2.5 bg-ams-blue text-white rounded-xl text-sm font-bold flex-1 hover:bg-blue-800 transition-colors">Save</button>
                  </div>
              </div>
          </div>
      )}
      
      <div className="w-full max-w-[300px] space-y-2">
         {value.length > 0 && (
             <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Logged Items ({value.length})</h4>
                    <button onClick={() => onChange([])} className="text-red-500 text-xs hover:underline font-medium">Clear All</button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {value.map((inj, idx) => (
                        <div key={idx} className="flex justify-between text-sm items-center p-2 bg-slate-50 rounded-lg border border-slate-100">
                            <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getCategoryColor(inj.type) }}></span>
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-700 text-xs">{inj.view.substring(0,4)}. - {inj.type}</span>
                                    {inj.notes && <span className="text-[10px] text-slate-500 truncate max-w-[140px]">{inj.notes}</span>}
                                </div>
                            </span>
                            <button 
                                onClick={() => onChange(value.filter((_, i) => i !== idx))}
                                className="text-slate-400 hover:text-red-500 transition-colors"
                            >
                                <Eraser className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
             </div>
         )}
      </div>
    </div>
  );
};

export default BodyMap;
