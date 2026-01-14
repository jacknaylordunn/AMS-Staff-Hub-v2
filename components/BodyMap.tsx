
import React, { useRef, useEffect, useState } from 'react';
import { RefreshCcw, Camera, Loader2 } from 'lucide-react';
import { InjuryMark } from '../types';
import { uploadDataUrl } from '../services/storage';

const ANTERIOR_URL = 'https://145955222.fs1.hubspotusercontent-eu1.net/hubfs/145955222/AMS/Staff%20Hub/Body%20Map%20-%20Front.jpeg';
const POSTERIOR_URL = 'https://145955222.fs1.hubspotusercontent-eu1.net/hubfs/145955222/AMS/Staff%20Hub/Body%20Map%20-%20Back.jpeg';

interface BodyMapProps {
    value: InjuryMark[];
    onChange: (marks: InjuryMark[]) => void;
    mode?: 'injury' | 'intervention';
    onMarkerClick?: (mark: InjuryMark) => void;
    onCanvasClick?: (x: number, y: number, view: 'Anterior' | 'Posterior', location: string) => void;
    onImageChange?: (url: string) => void; 
}

const BodyMap: React.FC<BodyMapProps> = ({ value = [], onChange, mode = 'injury', onMarkerClick, onCanvasClick, onImageChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [view, setView] = useState<'Anterior' | 'Posterior'>('Anterior');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const imageCache = useRef<Record<string, HTMLImageElement>>({});

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
          mode === 'injury' 
            ? (i.type === 'Injury' || i.type === 'Pain') 
            : (['IV','IO','IM','SC'].includes(i.type))
      ));

      relevantMarks.forEach(mark => {
          const drawX = mark.x * width;
          const drawY = mark.y * height;

          ctx.beginPath();
          // Color Coding
          if (mode === 'injury') {
              ctx.fillStyle = mark.type === 'Injury' ? '#ef4444' : '#f59e0b';
          } else {
              ctx.fillStyle = mark.success ? '#10b981' : '#ef4444';
          }
          
          const size = 10;

          if (mark.type === 'IO') {
              // Draw Triangle for IO
              ctx.moveTo(drawX, drawY - size);
              ctx.lineTo(drawX + size, drawY + size);
              ctx.lineTo(drawX - size, drawY + size);
              ctx.closePath();
          } else {
              // Draw Circle for IV/Injury
              ctx.arc(drawX, drawY, size, 0, 2 * Math.PI);
          }
          
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Label
          if (mark.subtype) {
              ctx.font = "bold 10px Arial";
              ctx.fillStyle = "#000";
              ctx.textAlign = "center";
              ctx.fillText(mark.subtype.substring(0, 2).toUpperCase(), drawX, drawY + 4);
          } else if (mode === 'intervention') {
              ctx.font = "bold 9px Arial";
              ctx.fillStyle = "#fff";
              ctx.textAlign = "center";
              ctx.fillText(mark.type, drawX, drawY + 3);
          }
      });
    }
  }, [view, value, mode, imageLoaded]);

  const getLocationName = (xPct: number, yPct: number, view: 'Anterior' | 'Posterior') => {
      let side = '';
      if (view === 'Anterior') side = xPct < 0.5 ? 'Right' : 'Left';
      else side = xPct < 0.5 ? 'Left' : 'Right';

      if (yPct < 0.125) return `Head/Face (${view})`;
      if (yPct < 0.17) return `Neck (${view})`;

      const isTorsoX = xPct > 0.25 && xPct < 0.75;

      if (yPct < 0.45) {
          if (isTorsoX) return view === 'Anterior' ? (yPct < 0.35 ? 'Chest' : 'Abdomen') : (yPct < 0.35 ? 'Upper Back' : 'Mid Back');
          else {
              if (yPct < 0.22) return `${side} Shoulder`;
              if (yPct < 0.38) return `${side} Upper Arm`;
              return `${side} Elbow`;
          }
      } 
      else if (yPct < 0.52) {
          return isTorsoX ? (view === 'Anterior' ? 'Pelvis/Groin' : 'Lower Back') : `${side} Forearm`;
      }
      else if (yPct < 0.62) {
          if (!isTorsoX) return `${side} Hand/Wrist`;
          return view === 'Anterior' ? `${side} Hip` : `${side} Buttock`;
      }
      else {
          if (yPct < 0.72) return `${side} Thigh`;
          if (yPct < 0.77) return `${side} Knee`;
          if (yPct < 0.92) return view === 'Anterior' ? `${side} Shin` : `${side} Calf`;
          return `${side} Foot/Ankle`;
      }
  };

  const handleInteraction = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width;
    const yPct = (e.clientY - rect.top) / rect.height;

    const threshold = 0.05; 
    const clickedMark = value.find(m => 
        m.view === view && 
        Math.abs(m.x - xPct) < threshold && 
        Math.abs(m.y - yPct) < (threshold * (rect.width/rect.height))
    );

    if (clickedMark && onMarkerClick) {
        onMarkerClick(clickedMark);
    } else if (onCanvasClick) {
        const loc = getLocationName(xPct, yPct, view);
        onCanvasClick(xPct, yPct, view, loc);
    }
  };

  const saveSnapshot = async () => {
      if (!canvasRef.current || !onImageChange) return;
      setIsUploading(true);
      try {
          const dataUrl = canvasRef.current.toDataURL('image/png');
          const url = await uploadDataUrl(dataUrl, 'body_maps');
          onImageChange(url);
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
          <canvas ref={canvasRef} onClick={handleInteraction} className="cursor-crosshair block" />
      </div>
      
      <div className="flex items-center justify-between w-full max-w-[300px]">
          <div className="text-[10px] text-slate-400 font-medium">
              Tap to add. Tap marker to edit.
          </div>
          {onImageChange && (
              <button 
                onClick={saveSnapshot}
                disabled={isUploading}
                className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-slate-900 disabled:opacity-50"
              >
                  {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                  Save PDF
              </button>
          )}
      </div>
    </div>
  );
};

export default BodyMap;
