
import React, { useRef, useEffect, useState } from 'react';
import { Eraser, RefreshCcw, Circle, AlertCircle, Zap, Activity, Square, Info, X, Syringe, Plus, CheckCircle, XCircle } from 'lucide-react';
import { InjuryMark } from '../types';

const ANTERIOR_URL = "https://145955222.fs1.hubspotusercontent-eu1.net/hubfs/145955222/AMS/Staff%20Hub/Body%20Map%20-%20Front.jpeg";
const POSTERIOR_URL = "https://145955222.fs1.hubspotusercontent-eu1.net/hubfs/145955222/AMS/Staff%20Hub/Body%20Map%20-%20Back.jpeg";

interface BodyMapProps {
    value: InjuryMark[];
    onChange: (marks: InjuryMark[]) => void;
}

const BodyMap: React.FC<BodyMapProps> = ({ value = [], onChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<'Anterior' | 'Posterior'>('Anterior');
  
  // Interaction State
  const [pendingMark, setPendingMark] = useState<{x: number, y: number} | null>(null);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editingMarkId, setEditingMarkId] = useState<string | null>(null);

  // Form State
  const [markType, setMarkType] = useState<'Injury' | 'IV' | 'Pain' | 'Other'>('Injury');
  const [markSubtype, setMarkSubtype] = useState('');
  const [markNotes, setMarkNotes] = useState('');
  const [ivSuccess, setIvSuccess] = useState(true);

  const IV_SIZES = ['24G Yellow', '22G Blue', '20G Pink', '18G Green', '16G Grey', '14G Orange', '12G White'];
  const INJURY_TYPES = ['Abrasion', 'Laceration', 'Bruise/Contusion', 'Burn', 'Deformity', 'Swelling', 'Gunshot/Stab', 'Puncture', 'Tenderness'];

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
        const color = getCategoryColor(mark.type);
        
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;

        if (mark.type === 'IV') {
            // Draw Square for IV
            ctx.rect(mark.x - 6, mark.y - 6, 12, 12);
            ctx.fill();
            ctx.stroke();
            
            // Success/Fail indicator
            ctx.beginPath();
            ctx.fillStyle = mark.success !== false ? '#fff' : '#000';
            ctx.arc(mark.x, mark.y, 2, 0, 2 * Math.PI);
            ctx.fill();

        } else if (mark.type === 'Pain') {
            // Draw Lightning boltish zig zag
            ctx.moveTo(mark.x - 4, mark.y - 6);
            ctx.lineTo(mark.x + 4, mark.y);
            ctx.lineTo(mark.x - 4, mark.y + 6);
            ctx.strokeStyle = color;
            ctx.stroke();
        } else {
            // Circle for Injury
            ctx.arc(mark.x, mark.y, 6, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
        }
      });

      // Draw pending mark if exists
      if (pendingMark) {
          ctx.beginPath();
          ctx.fillStyle = 'rgba(0, 82, 204, 0.5)';
          ctx.arc(pendingMark.x, pendingMark.y, 8, 0, 2 * Math.PI);
          ctx.fill();
      }
    };
  }, [view, value, pendingMark]);

  const getCategoryColor = (type: string) => {
      switch(type) {
          case 'Injury': return '#EF4444'; // Red
          case 'IV': return '#3B82F6'; // Blue
          case 'Pain': return '#F59E0B'; // Amber
          default: return '#10B981';
      }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking existing
    const clickedMark = value.find(m => 
        m.view === view && 
        Math.abs(m.x - x) < 15 && 
        Math.abs(m.y - y) < 15
    );

    if (clickedMark) {
        setEditingMarkId(clickedMark.id);
        setMarkType(clickedMark.type);
        setMarkSubtype(clickedMark.subtype || '');
        setMarkNotes(clickedMark.notes || '');
        setIvSuccess(clickedMark.success !== false);
        setShowTypeModal(true);
        return;
    }

    setPendingMark({ x, y });
    setEditingMarkId(null);
    setMarkType('Injury');
    setMarkSubtype('');
    setMarkNotes('');
    setIvSuccess(true);
    setShowTypeModal(true);
  };

  const saveMark = () => {
      if (editingMarkId) {
          // Update Existing
          const updated = value.map(m => m.id === editingMarkId ? { 
              ...m, 
              type: markType, 
              subtype: markSubtype, 
              notes: markNotes,
              success: markType === 'IV' ? ivSuccess : undefined 
          } : m);
          onChange(updated);
      } else if (pendingMark) {
          // Create New
          const newMark: InjuryMark = {
              id: Date.now().toString(),
              x: pendingMark.x,
              y: pendingMark.y,
              view,
              type: markType,
              subtype: markSubtype,
              notes: markNotes,
              success: markType === 'IV' ? ivSuccess : undefined
          };
          onChange([...value, newMark]);
      }
      closeModal();
  };

  const deleteMark = () => {
      if (editingMarkId) {
          onChange(value.filter(m => m.id !== editingMarkId));
      }
      closeModal();
  };

  const closeModal = () => {
      setShowTypeModal(false);
      setPendingMark(null);
      setEditingMarkId(null);
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full relative">
      <div className="flex justify-between w-full max-w-[300px]">
          <button 
            onClick={() => setView(view === 'Anterior' ? 'Posterior' : 'Anterior')}
            className="flex items-center gap-2 px-6 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl shadow-sm text-sm font-bold w-full justify-center hover:bg-slate-50 transition-colors"
          >
            <RefreshCcw className="w-4 h-4" />
            {view === 'Anterior' ? 'Front View' : 'Back View'}
          </button>
      </div>

      <div className="relative border-4 border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-inner select-none cursor-crosshair" ref={containerRef}>
        <canvas
            ref={canvasRef}
            className="touch-none block"
            onClick={handleCanvasClick}
        />
        <div className="absolute bottom-3 left-0 right-0 text-center pointer-events-none">
            <span className="px-3 py-1 bg-black/50 text-white rounded-full text-[10px] backdrop-blur-md font-bold uppercase tracking-wider">
                {view}
            </span>
        </div>
      </div>

      {/* Detail Modal */}
      {showTypeModal && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-2 backdrop-blur-sm bg-black/10">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-xs animate-in zoom-in duration-200">
                  <div className="flex justify-between items-center mb-4">
                      <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                          {editingMarkId ? 'Edit Marker' : 'Add Marker'}
                      </h4>
                      <button onClick={closeModal} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                  </div>

                  {/* Type Selector */}
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg mb-4">
                      {['Injury', 'IV', 'Pain', 'Other'].map((t) => (
                          <button
                            key={t}
                            onClick={() => setMarkType(t as any)}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${markType === t ? 'bg-white dark:bg-slate-700 shadow text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
                          >
                              {t}
                          </button>
                      ))}
                  </div>

                  {/* Dynamic Sub-options */}
                  <div className="space-y-3 mb-4">
                      {markType === 'IV' ? (
                          <>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Gauge</label>
                                <select 
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm outline-none dark:text-white"
                                    value={markSubtype}
                                    onChange={e => setMarkSubtype(e.target.value)}
                                >
                                    <option value="">Select Size...</option>
                                    {IV_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            
                            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                                <button 
                                    onClick={() => setIvSuccess(true)}
                                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-bold rounded-md transition-all ${ivSuccess ? 'bg-green-100 text-green-700' : 'text-slate-500'}`}
                                >
                                    <CheckCircle className="w-3 h-3" /> Successful
                                </button>
                                <button 
                                    onClick={() => setIvSuccess(false)}
                                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-bold rounded-md transition-all ${!ivSuccess ? 'bg-red-100 text-red-700' : 'text-slate-500'}`}
                                >
                                    <XCircle className="w-3 h-3" /> Failed
                                </button>
                            </div>
                          </>
                      ) : (
                          <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Type</label>
                              <select 
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm outline-none dark:text-white"
                                value={markSubtype}
                                onChange={e => setMarkSubtype(e.target.value)}
                              >
                                  <option value="">Select Type...</option>
                                  {INJURY_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                          </div>
                      )}

                      <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Notes</label>
                          <textarea 
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm outline-none resize-none dark:text-white"
                            rows={2}
                            placeholder={markType === 'IV' ? "e.g. 1st attempt, slight resistance" : "Description..."}
                            value={markNotes}
                            onChange={e => setMarkNotes(e.target.value)}
                          />
                      </div>
                  </div>

                  <div className="flex gap-2">
                      {editingMarkId && (
                          <button onClick={deleteMark} className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors">Delete</button>
                      )}
                      <button onClick={saveMark} className="px-4 py-2 bg-ams-blue text-white rounded-xl text-xs font-bold flex-1 hover:bg-blue-800 transition-colors shadow-sm">Save Marker</button>
                  </div>
              </div>
          </div>
      )}
      
      <div className="w-full max-w-[300px] space-y-2">
         {value.length > 0 && (
             <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Logged Items ({value.length})</h4>
                    <button onClick={() => onChange([])} className="text-red-500 text-xs hover:underline font-medium">Clear All</button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {value.map((inj, idx) => (
                        <div key={idx} className="flex justify-between text-sm items-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-700">
                            <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getCategoryColor(inj.type) }}></span>
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-700 dark:text-slate-200 text-xs flex items-center gap-1">
                                        {inj.type} - {inj.subtype || 'Unspecified'}
                                        {inj.type === 'IV' && (
                                            <span className={`w-1.5 h-1.5 rounded-full ${inj.success !== false ? 'bg-green-500' : 'bg-red-500'}`} />
                                        )}
                                    </span>
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{inj.view}</span>
                                </div>
                            </span>
                            <button 
                                onClick={() => onChange(value.filter((_, i) => i !== idx))}
                                className="text-slate-400 hover:text-red-500 transition-colors"
                            >
                                <Eraser className="w-3 h-3" />
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
