
import React, { useRef, useState, useEffect } from 'react';
import { RotateCcw, Check, Trash2, PenTool, X, Clock, Calendar } from 'lucide-react';

interface SignaturePadProps {
  label: string;
  value?: string;
  timestamp?: string;
  onSave: (data: string) => void;
  onTimestampChange?: (time: string) => void;
  required?: boolean;
  timeRequired?: boolean;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ 
    label, 
    value, 
    timestamp, 
    onSave, 
    onTimestampChange, 
    required,
    timeRequired 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(!value);

  // Initialize canvas when modal opens
  useEffect(() => {
    if (isModalOpen) {
      setTimeout(initCanvas, 100);
    }
  }, [isModalOpen]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (parent) {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    }

    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Settings
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#000';

        if (value && !value.startsWith('OFFLINE')) {
            const img = new Image();
            img.src = value;
            img.onload = () => {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                setIsEmpty(false);
            };
        } else {
            setIsEmpty(true);
        }
    }
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    setIsEmpty(false);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const ctx = canvasRef.current?.getContext('2d');
    ctx?.beginPath();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = (e as React.MouseEvent).clientX;
        clientY = (e as React.MouseEvent).clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setIsEmpty(true);
    }
  };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (canvas && !isEmpty) {
        const dataUrl = canvas.toDataURL();
        onSave(dataUrl);
        // Auto-fill timestamp if empty when signing
        if (onTimestampChange && !timestamp) {
            handleSetTimeNow();
        }
    } else if (isEmpty) {
        // If empty and confirmed, treat as clear
        onSave('');
    }
    setIsModalOpen(false);
  };

  const handleClearSignature = (e: React.MouseEvent) => {
      e.stopPropagation();
      onSave('');
      setIsEmpty(true);
      // Optional: Clear timestamp too? Probably keep it if manual entry, but logically signature clear = no signature time.
      // Let's keep timestamp for audit unless manually cleared.
  };

  const handleSetTimeNow = () => {
      if (onTimestampChange) {
          const now = new Date();
          // ISO format is better for data, but display needs to be friendly or standard.
          // App uses locale strings mostly.
          const timeStr = now.toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
          onTimestampChange(timeStr);
      }
  };

  const isSigned = value && value.length > 50;
  const displaySrc = value?.startsWith('OFFLINE_PENDING::') ? value.split('::')[2] : value;

  return (
    <div className="w-full mb-4">
      <div className="flex justify-between items-end mb-2">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
              {label} {required && <span className="text-red-500">*</span>}
          </label>
      </div>

      <div className="space-y-2">
          {/* Signature Box - Forced White Background for visibility */}
          <div 
            onClick={() => setIsModalOpen(true)}
            className={`
                relative h-32 rounded-xl border-2 border-dashed cursor-pointer transition-all group overflow-hidden bg-white
                ${isSigned 
                    ? 'border-green-500' 
                    : 'border-slate-300 dark:border-slate-600 hover:border-ams-blue'
                }
            `}
          >
              {isSigned ? (
                  <>
                    <img src={displaySrc} alt="Signature" className="w-full h-full object-contain p-2" />
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity gap-3">
                        <button className="bg-white text-slate-800 px-3 py-1 rounded-full text-xs font-bold shadow-sm flex items-center gap-1">
                            <PenTool className="w-3 h-3" /> Edit
                        </button>
                        <button onClick={handleClearSignature} className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-bold shadow-sm flex items-center gap-1">
                            <Trash2 className="w-3 h-3" /> Clear
                        </button>
                    </div>
                    <div className="absolute bottom-2 right-2 bg-green-100 text-green-700 rounded-full p-1 shadow-sm">
                        <Check className="w-4 h-4" />
                    </div>
                  </>
              ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-300">
                      <PenTool className="w-8 h-8 mb-2 opacity-50" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Tap to Sign</span>
                  </div>
              )}
          </div>

          {/* Timestamp Controls */}
          {onTimestampChange && (
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <input 
                      type="text" 
                      placeholder={timeRequired ? "Date & Time Required *" : "Date & Time"}
                      value={timestamp || ''}
                      onClick={() => !timestamp && handleSetTimeNow()}
                      onChange={(e) => onTimestampChange(e.target.value)}
                      className={`flex-1 bg-transparent text-sm outline-none font-mono ${timeRequired && !timestamp ? 'placeholder-red-400' : 'text-slate-700 dark:text-slate-200'}`}
                  />
                  <button 
                    onClick={handleSetTimeNow}
                    className="text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                  >
                      NOW
                  </button>
              </div>
          )}
      </div>

      {/* Modal */}
      {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                          <PenTool className="w-4 h-4 text-ams-blue" /> {label}
                      </h3>
                      <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full">
                          <X className="w-5 h-5 text-slate-500" />
                      </button>
                  </div>
                  
                  <div className="relative h-64 w-full bg-white touch-none">
                      <canvas 
                          ref={canvasRef}
                          className="absolute inset-0 w-full h-full cursor-crosshair"
                          onMouseDown={startDrawing}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onMouseMove={draw}
                          onTouchStart={startDrawing}
                          onTouchEnd={stopDrawing}
                          onTouchMove={draw}
                      />
                      {isEmpty && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                              <span className="text-4xl font-bold text-slate-300">SIGN HERE</span>
                          </div>
                      )}
                  </div>

                  <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between gap-3">
                      <button 
                        onClick={clearCanvas}
                        className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-2"
                      >
                          <RotateCcw className="w-4 h-4" /> Clear
                      </button>
                      <div className="flex gap-2">
                          <button 
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg transition-colors"
                          >
                              Cancel
                          </button>
                          <button 
                            onClick={handleConfirm}
                            className="px-6 py-2 bg-ams-blue text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
                          >
                              <Check className="w-4 h-4" /> Done
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default SignaturePad;
