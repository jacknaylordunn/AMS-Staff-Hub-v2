import React, { useRef, useState, useEffect } from 'react';
import { RotateCcw, Check, Trash2 } from 'lucide-react';

interface SignaturePadProps {
  label: string;
  value?: string;
  onSave: (data: string) => void;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ label, value, onSave }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    if (value) {
        setHasSignature(true);
    }
  }, [value]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
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

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
    
    // Only set "hasSignature" local state if we are actually drawing
    if (!hasSignature) setHasSignature(true);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
      onSave(''); // Clear data in parent
    }
  };

  const save = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      onSave(canvas.toDataURL());
    }
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      
      {value ? (
          <div className="border border-slate-300 rounded-lg bg-white p-2 relative group">
              <img src={value} alt="Signature" className="h-48 w-full object-contain" />
              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <button 
                     onClick={() => onSave('')}
                     className="bg-white text-red-600 px-4 py-2 rounded-lg font-bold shadow-lg flex items-center gap-2"
                   >
                       <Trash2 className="w-4 h-4" /> Clear Signature
                   </button>
              </div>
              <div className="absolute bottom-2 right-2 flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-bold">
                  <Check className="w-3 h-3" /> Signed
              </div>
          </div>
      ) : (
          <>
            <div className="border border-slate-300 rounded-lg bg-white overflow-hidden relative">
                <canvas
                ref={canvasRef}
                width={500}
                height={200}
                className="w-full h-48 touch-none cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseUp={stopDrawing}
                onMouseMove={draw}
                onTouchStart={startDrawing}
                onTouchEnd={stopDrawing}
                onTouchMove={draw}
                />
                <div className="absolute top-2 right-2 flex gap-2">
                <button 
                    onClick={clear}
                    type="button"
                    className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600"
                >
                    <RotateCcw className="w-4 h-4" />
                </button>
                </div>
            </div>
            {hasSignature && (
                <button 
                    type="button"
                    onClick={save}
                    className="mt-2 w-full py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                >
                    <Check className="w-4 h-4" /> Confirm Signature
                </button>
            )}
          </>
      )}
    </div>
  );
};

export default SignaturePad;