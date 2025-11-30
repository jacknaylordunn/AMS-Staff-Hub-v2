
import React, { useRef, useEffect, useState } from 'react';
import { RefreshCcw, Plus, X } from 'lucide-react';
import { InjuryMark } from '../types';

// Using public assets path
const ANTERIOR_URL = '/assets/body-map-front.jpeg';
const POSTERIOR_URL = '/assets/body-map-back.jpeg';

interface BodyMapProps {
    value: InjuryMark[];
    onChange: (marks: InjuryMark[]) => void;
    mode?: 'injury' | 'intervention'; // Default to 'injury'
    onMarkerSelect?: (mark: InjuryMark) => void;
    onImageChange?: (dataUrl: string) => void;
}

const BodyMap: React.FC<BodyMapProps> = ({ value = [], onChange, mode = 'injury', onMarkerSelect, onImageChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [view, setView] = useState<'Anterior' | 'Posterior'>('Anterior');
  const [pendingMark, setPendingMark] = useState<{x: number, y: number} | null>(null);
  const [showTypeModal, setShowTypeModal] = useState(false);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 300; 
    const height = 600; 
    
    // Set standard size for consistent output
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = view === 'Anterior' ? ANTERIOR_URL : POSTERIOR_URL;
    
    img.onload = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      
      const relevantMarks = value.filter(i => i.view === view && (
          mode === 'injury' ? (i.type === 'Injury' || i.type === 'Pain') : (i.type === 'IV' || i.type === 'Other')
      ));

      relevantMarks.forEach(mark => {
          // Backward compatibility: If coordinate > 1, assume pixels. Else assume percentage.
          const drawX = mark.x <= 1 ? mark.x * width : mark.x;
          const drawY = mark.y <= 1 ? mark.y * height : mark.y;

          ctx.beginPath();
          ctx.fillStyle = mark.type === 'Injury' ? '#ef4444' : mark.type === 'Pain' ? '#f59e0b' : '#3b82f6';
          
          const size = 8;
          ctx.arc(drawX, drawY, size, 0, 2 * Math.PI);
          ctx.fill();
          
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.stroke();

          if (mark.subtype) {
              ctx.font = "bold 10px Arial";
              ctx.fillStyle = "#000";
              ctx.textAlign = "center";
              ctx.fillText(mark.subtype.substring(0, 2).toUpperCase(), drawX, drawY + 4);
          }
      });

      if (pendingMark) {
          const pmX = pendingMark.x * width;
          const pmY = pendingMark.y * height;

          ctx.beginPath();
          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.arc(pmX, pmY, 10, 0, 2 * Math.PI);
          ctx.fill();
          
          ctx.beginPath();
          ctx.strokeStyle = mode === 'injury' ? '#ef4444' : '#3b82f6';
          ctx.lineWidth = 2;
          ctx.arc(pmX, pmY, 10, 0, 2 * Math.PI);
          ctx.stroke();
      }

      // Export image data
      if (onImageChange) {
          const dataUrl = canvas.toDataURL('image/png');
          onImageChange(dataUrl);
      }
    };

    img.onerror = () => {
        console.error("Failed to load body map image:", img.src);
        // Draw fallback or clear canvas to prevent stale state
        ctx.clearRect(0, 0, width, height);
        ctx.font = "14px Arial";
        ctx.fillStyle = "gray";
        ctx.textAlign = "center";
        ctx.fillText("Body Map Image Not Found", width / 2, height / 2);
    };

  }, [view, value, pendingMark, mode]);

  const handleCanvasClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    // Calculate percentage (0-1) relative to displayed size
    // This makes the click independent of CSS scaling vs internal resolution
    const xPct = (e.clientX - rect.left) / rect.width;
    const yPct = (e.clientY - rect.top) / rect.height;

    setPendingMark({ x: xPct, y: yPct });
    setShowTypeModal(true);
  };

  const getLocationName = (xPct: number, yPct: number, view: 'Anterior' | 'Posterior') => {
      // Relative Coordinate Mapping (0-1)
      let location = 'Unknown';
      
      // Head (Top 11.6%)
      if (yPct < 0.116) location = 'Head/Face';
      // Neck (11.6% - 16.6%)
      else if (yPct >= 0.116 && yPct < 0.166) location = 'Neck';
      // Torso vs Arms (16.6% - 41.6%)
      else if (yPct >= 0.166 && yPct < 0.416) {
          if (xPct < 0.25) location = view === 'Anterior' ? 'Right Arm' : 'Left Arm';
          else if (xPct > 0.75) location = view === 'Anterior' ? 'Left Arm' : 'Right Arm';
          else location = view === 'Anterior' ? 'Chest' : 'Back';
      }
      // Abdomen/Pelvis/Forearms (41.6% - 53.3%)
      else if (yPct >= 0.416 && yPct < 0.533) {
          if (xPct < 0.25) location = view === 'Anterior' ? 'Right Forearm' : 'Left Forearm';
          else if (xPct > 0.75) location = view === 'Anterior' ? 'Left Forearm' : 'Right Forearm';
          else location = view === 'Anterior' ? 'Abdomen/Pelvis' : 'Lower Back';
      }
      // Legs (> 53.3%)
      else {
          if (xPct < 0.5) location = view === 'Anterior' ? 'Right Leg' : 'Left Leg';
          else location = view === 'Anterior' ? 'Left Leg' : 'Right Leg';
      }
      
      return `${location} (${view})`;
  };

  const saveMark = (type: string, subtype: string) => {
      if (!pendingMark) return;
      
      const locationName = getLocationName(pendingMark.x, pendingMark.y, view);

      const newMark: InjuryMark = {
          id: Date.now().toString(),
          x: pendingMark.x, // Store percentage
          y: pendingMark.y, // Store percentage
          view,
          type: type as any,
          subtype: subtype,
          location: locationName,
          success: true
      };
      
      const newMarks = [...value, newMark];
      onChange(newMarks);
      if (onMarkerSelect) onMarkerSelect(newMark);
      
      setShowTypeModal(false);
      setPendingMark(null);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex justify-between w-full max-w-[300px]">
          <span className="text-xs font-bold text-slate-400 uppercase self-center">{mode === 'injury' ? 'Body Map' : 'Access Map'}</span>
          <button onClick={() => setView(view === 'Anterior' ? 'Posterior' : 'Anterior')} className="px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm">
              <RefreshCcw className="w-3 h-3" /> Flip Body
          </button>
      </div>
      
      <div className="relative rounded-2xl overflow-hidden shadow-lg border-4 border-white dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
          <canvas ref={canvasRef} onClick={handleCanvasClick} className="cursor-crosshair block" />
          
          {showTypeModal && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-10 animate-in fade-in">
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-xl w-56 space-y-3">
                      <div className="flex justify-between items-center mb-2">
                          <h4 className="font-bold text-sm text-slate-800 dark:text-white">Select {mode === 'injury' ? 'Injury' : 'Access'}</h4>
                          <button onClick={() => { setShowTypeModal(false); setPendingMark(null); }}><X className="w-4 h-4 text-slate-400" /></button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                          {mode === 'injury' ? (
                              <>
                                <button onClick={() => saveMark('Injury', 'Abrasion')} className="p-2 bg-red-50 hover:bg-red-100 text-red-700 rounded text-xs font-bold border border-red-100">Abrasion</button>
                                <button onClick={() => saveMark('Injury', 'Laceration')} className="p-2 bg-red-50 hover:bg-red-100 text-red-700 rounded text-xs font-bold border border-red-100">Laceration</button>
                                <button onClick={() => saveMark('Injury', 'Burn')} className="p-2 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded text-xs font-bold border border-orange-100">Burn</button>
                                <button onClick={() => saveMark('Injury', 'Bruise')} className="p-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded text-xs font-bold border border-purple-100">Bruise</button>
                                <button onClick={() => saveMark('Pain', 'Pain')} className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded text-xs font-bold border border-amber-100 col-span-2">Pain Site</button>
                              </>
                          ) : (
                              <>
                                <button onClick={() => saveMark('IV', 'Cannula')} className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-xs font-bold border border-blue-100">IV Cannula</button>
                                <button onClick={() => saveMark('IV', 'IO')} className="p-2 bg-red-50 hover:bg-red-100 text-red-700 rounded text-xs font-bold border border-red-100">IO Access</button>
                                <button onClick={() => saveMark('Other', 'IM')} className="p-2 bg-green-50 hover:bg-green-100 text-green-700 rounded text-xs font-bold border border-green-100">IM Site</button>
                                <button onClick={() => saveMark('Other', 'SC')} className="p-2 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded text-xs font-bold border border-teal-100">SC Site</button>
                              </>
                          )}
                      </div>
                  </div>
              </div>
          )}
      </div>
      <div className="text-[10px] text-slate-400 font-medium">
          {mode === 'injury' ? 'Tap to mark injury locations' : 'Tap to mark vascular access sites'}
      </div>
    </div>
  );
};

export default BodyMap;
