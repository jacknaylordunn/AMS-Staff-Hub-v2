
import React, { useRef, useState, useEffect } from 'react';
import { RotateCcw, Check, Trash2, Loader2, WifiOff, Clock } from 'lucide-react';
import { uploadDataUrl } from '../services/storage';

interface SignaturePadProps {
  label: string;
  value?: string;
  timestamp?: string; // Optional timestamp state
  onSave: (data: string) => void;
  onTimestampChange?: (time: string) => void; // Optional handler
  required?: boolean;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ label, value, timestamp, onSave, onTimestampChange, required }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Force reset hasSignature if value is cleared externally
  useEffect(() => {
    if (value && value.length > 50) {
        setHasSignature(true);
    } else {
        setHasSignature(false);
        // Ensure canvas is cleared if it exists in DOM
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
    }
  }, [value]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    ctx?.beginPath();
    
    // Auto-save on stop to ensure state propagates
    if (canvas) {
        const dataUrl = canvas.toDataURL();
        // Check if empty canvas (white/transparent)
        const blank = document.createElement('canvas');
        blank.width = canvas.width;
        blank.height = canvas.height;
        if (dataUrl !== blank.toDataURL()) {
            setHasSignature(true);
            onSave(dataUrl); 
            // Auto set time if not set
            if (onTimestampChange && !timestamp) {
                const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                onTimestampChange(now);
            }
        }
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    
    // Account for potential scaling of the canvas element vs internal resolution
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;

    if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = (e as React.MouseEvent).clientX;
        clientY = (e as React.MouseEvent).clientY;
    }

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000'; // Always black ink

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
      onSave(''); 
      // Reset timestamp if handler provided
      if (onTimestampChange) onTimestampChange('');
    }
  };

  // Helper to get display source (handles OFFLINE_PENDING prefix)
  const getDisplaySource = (val: string) => {
      if (val.startsWith('OFFLINE_PENDING::')) {
          const parts = val.split('::');
          return parts[2]; // Return the raw base64 part
      }
      return val;
  };

  const isOfflinePending = value?.startsWith('OFFLINE_PENDING::');

  return (
    <div className="w-full">
      <div className="flex justify-between items-end mb-2">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
              {label} {required && <span className="text-red-500">*</span>}
          </label>
      </div>
      
      {value ? (
          <div className={`border rounded-xl bg-white p-2 relative group overflow-hidden ${isOfflinePending ? 'border-amber-400 border-dashed' : 'border-slate-300 dark:border-slate-700'}`}>
              <img src={getDisplaySource(value)} alt="Signature" className="h-40 w-full object-contain" />
              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <button 
                     onClick={() => { onSave(''); if(onTimestampChange) onTimestampChange(''); }}
                     className="bg-white text-red-600 px-4 py-2 rounded-lg font-bold shadow-lg flex items-center gap-2"
                   >
                       <Trash2 className="w-4 h-4" /> Clear Signature
                   </button>
              </div>
              <div className={`absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${isOfflinePending ? 'bg-amber-100 text-amber-700' : 'bg-green-50 text-green-600'}`}>
                  {isOfflinePending ? (
                      <><WifiOff className="w-3 h-3" /> Offline (Pending Sync)</>
                  ) : (
                      <><Check className="w-3 h-3" /> Signed</>
                  )}
              </div>
          </div>
      ) : (
          <div className="border border-slate-300 dark:border-slate-700 rounded-xl bg-white overflow-hidden relative">
                {/* Canvas is always white for contrast with black ink. Added touch-action: none */}
                <canvas
                ref={canvasRef}
                width={600} 
                height={200}
                className="w-full h-40 touch-none cursor-crosshair bg-white block"
                style={{ touchAction: 'none' }}
                onMouseDown={startDrawing}
                onMouseUp={stopDrawing}
                onMouseMove={draw}
                onTouchStart={startDrawing}
                onTouchEnd={stopDrawing}
                onTouchMove={draw}
                onMouseLeave={stopDrawing}
                />
                <div className="absolute top-2 right-2 flex gap-2">
                <button 
                    onClick={clear}
                    type="button"
                    className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200"
                    title="Clear"
                >
                    <RotateCcw className="w-4 h-4" />
                </button>
                </div>
                <div className="absolute bottom-2 left-2 text-[10px] text-slate-400 pointer-events-none">
                    Sign Here (Black Ink)
                </div>
            </div>
      )}

      {/* Time Input Below */}
      {onTimestampChange && (
          <div className="mt-2 flex items-center gap-2 justify-end">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Time Signed:</span>
              <div className="relative">
                  <Clock className="absolute left-2 top-1.5 w-3 h-3 text-slate-400" />
                  <input 
                      type="time" 
                      className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-1 px-2 pl-6 text-xs font-mono font-bold dark:text-white w-24"
                      value={timestamp || ''}
                      onChange={e => onTimestampChange(e.target.value)}
                  />
                  {!timestamp && (
                      <button 
                        onClick={() => onTimestampChange(new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}))}
                        className="absolute right-0 top-0 bottom-0 px-2 bg-ams-blue text-white rounded-r-lg text-[10px] font-bold"
                      >
                          Now
                      </button>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};

export default SignaturePad;
