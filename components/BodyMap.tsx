
import React, { useRef, useEffect, useState } from 'react';
import { RefreshCcw, Plus, X, Camera, Loader2, Check } from 'lucide-react';
import { InjuryMark } from '../types';
import { uploadDataUrl } from '../services/storage';

// Using hosted public assets
const ANTERIOR_URL = 'https://145955222.fs1.hubspotusercontent-eu1.net/hubfs/145955222/AMS/Staff%20Hub/Body%20Map%20-%20Front.jpeg';
const POSTERIOR_URL = 'https://145955222.fs1.hubspotusercontent-eu1.net/hubfs/145955222/AMS/Staff%20Hub/Body%20Map%20-%20Back.jpeg';

interface BodyMapProps {
    value: InjuryMark[];
    onChange: (marks: InjuryMark[]) => void;
    mode?: 'injury' | 'intervention'; // Default to 'injury'
    onMarkerSelect?: (mark: InjuryMark) => void;
    onImageChange?: (url: string) => void; // Now expects URL, not base64
}

const BodyMap: React.FC<BodyMapProps> = ({ value = [], onChange, mode = 'injury', onMarkerSelect, onImageChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [view, setView] = useState<'Anterior' | 'Posterior'>('Anterior');
  const [pendingMark, setPendingMark] = useState<{x: number, y: number} | null>(null);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  
  // Cache images to prevent reloading/flicker
  const imageCache = useRef<Record<string, HTMLImageElement>>({});
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
      const url = view === 'Anterior' ? ANTERIOR_URL : POSTERIOR_URL;
      
      if (imageCache.current[url]) {
          setImageLoaded(true);
          return;
      }

      setImageLoaded(false);
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = url;
      img.onload = () => {
          imageCache.current[url] = img;
          setImageLoaded(true);
      };
  }, [view]);

  useEffect(() => {
    if (!imageLoaded) return;
    
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
    
    const url = view === 'Anterior' ? ANTERIOR_URL : POSTERIOR_URL;
    const img = imageCache.current[url];
    
    if (img) {
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
    }
  }, [view, value, pendingMark, mode, imageLoaded]);

  const handleCanvasClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width;
    const yPct = (e.clientY - rect.top) / rect.height;

    setPendingMark({ x: xPct, y: yPct });
    setShowTypeModal(true);
  };

  const getLocationName = (xPct: number, yPct: number, view: 'Anterior' | 'Posterior') => {
      let side = '';
      if (view === 'Anterior') {
          // Anterior View: Viewer Left (x < 0.5) is Patient Right
          side = xPct < 0.5 ? 'Right' : 'Left';
      } else {
          // Posterior View: Viewer Left (x < 0.5) is Patient Left
          side = xPct < 0.5 ? 'Left' : 'Right';
      }

      // Head / Neck
      if (yPct < 0.125) return `Head/Face (${view})`;
      if (yPct < 0.17) return `Neck (${view})`;

      // Torso X Boundaries (approx 25% to 75% is central body width, arms outside)
      // Assuming 300px width, shoulders/arms are typically outside x=75 and x=225 (0.25/0.75)
      const isTorsoX = xPct > 0.25 && xPct < 0.75;

      // Upper Body (Chest/Back/Arms)
      if (yPct < 0.45) {
          if (isTorsoX) {
              if (yPct < 0.35) return view === 'Anterior' ? 'Chest' : 'Upper Back';
              return view === 'Anterior' ? 'Abdomen' : 'Mid Back';
          } else {
              // Arms
              if (yPct < 0.22) return `${side} Shoulder`;
              if (yPct < 0.38) return `${side} Upper Arm`;
              return `${side} Elbow`;
          }
      } 
      // Mid Body (Pelvis/Lower Back/Forearms)
      else if (yPct < 0.52) {
          if (isTorsoX) {
              return view === 'Anterior' ? 'Pelvis/Groin' : 'Lower Back/Buttocks';
          } else {
              return `${side} Forearm`;
          }
      }
      // Hips / Hands
      else if (yPct < 0.62) {
          // Hands usually hang down here if arms straight
          if (!isTorsoX) return `${side} Hand/Wrist`;
          // Otherwise upper thigh/hip area
          return view === 'Anterior' ? `${side} Hip/Groin` : `${side} Buttock`;
      }
      // Legs
      else {
          if (yPct < 0.72) return `${side} Thigh`;
          if (yPct < 0.77) return `${side} Knee`;
          if (yPct < 0.92) return view === 'Anterior' ? `${side} Shin` : `${side} Calf`;
          return `${side} Foot/Ankle`;
      }
  };

  const saveMark = (type: string, subtype: string) => {
      if (!pendingMark) return;
      const locationName = getLocationName(pendingMark.x, pendingMark.y, view);
      const newMark: InjuryMark = {
          id: Date.now().toString(),
          x: pendingMark.x,
          y: pendingMark.y,
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
      setLastSaved(null); // Reset saved status on modification
  };

  const saveSnapshot = async () => {
      if (!canvasRef.current || !onImageChange) return;
      setIsUploading(true);
      try {
          const dataUrl = canvasRef.current.toDataURL('image/png');
          const url = await uploadDataUrl(dataUrl, 'body_maps');
          onImageChange(url);
          setLastSaved(new Date().toLocaleTimeString());
      } catch (e) {
          alert("Failed to save snapshot.");
      } finally {
          setIsUploading(false);
      }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex justify-between w-full max-w-[300px]">
          <span className="text-xs font-bold text-slate-400 uppercase self-center">{mode === 'injury' ? 'Body Map' : 'Access Map'}</span>
          <button 
            onClick={() => setView(view === 'Anterior' ? 'Posterior' : 'Anterior')} 
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-500 text-slate-700 dark:text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
          >
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
      
      {onImageChange && (
          <div className="flex items-center gap-2">
              <button 
                onClick={saveSnapshot}
                disabled={isUploading}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-slate-900 disabled:opacity-50"
              >
                  {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                  Save Snapshot
              </button>
              {lastSaved && <span className="text-xs text-green-600 font-bold flex items-center gap-1"><Check className="w-3 h-3" /> Saved</span>}
          </div>
      )}
      
      <div className="text-[10px] text-slate-400 font-medium text-center">
          {mode === 'injury' ? 'Tap to mark injury locations' : 'Tap to mark vascular access sites'}
      </div>
    </div>
  );
};

export default BodyMap;
