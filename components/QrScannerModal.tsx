
import React, { useEffect, useState, useRef } from 'react';
import { X, Camera, Image as ImageIcon, Loader2, AlertCircle, Keyboard } from 'lucide-react';
import jsQR from 'jsqr';

interface QrScannerModalProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

const QrScannerModal: React.FC<QrScannerModalProps> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string>('');
  const [manualCode, setManualCode] = useState('');
  const [isManual, setIsManual] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let animationFrameId: number;

    const startCamera = async () => {
      try {
        const constraints = { 
            video: { 
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            } 
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Required for iOS Safari
          videoRef.current.setAttribute('playsinline', 'true');
          
          videoRef.current.onloadedmetadata = () => {
              setLoading(false);
              videoRef.current?.play();
              requestAnimationFrame(tick);
          };
        }
        setHasPermission(true);
      } catch (err: any) {
        console.error("Camera Error: ", err);
        setHasPermission(false);
        setError('Camera access denied or unavailable.');
        setIsManual(true);
        setLoading(false);
      }
    };

    const tick = () => {
        if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            
            if (canvas) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                
                if (ctx) {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    
                    const code = jsQR(imageData.data, imageData.width, imageData.height, {
                        inversionAttempts: "dontInvert",
                    });

                    if (code && code.data) {
                        onScan(code.data);
                        return; // Stop scanning
                    }
                }
            }
        }
        animationFrameId = requestAnimationFrame(tick);
    };

    if (!isManual) {
        startCamera();
    } else {
        setLoading(false);
    }

    return () => {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    };
  }, [onScan, isManual]);

  const handleManualSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (manualCode.trim()) onScan(manualCode.trim());
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col animate-in fade-in duration-300">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-20 text-white">
            <button onClick={onClose} className="p-2 bg-black/40 backdrop-blur-md rounded-full hover:bg-white/10 transition-colors">
                <X className="w-6 h-6" />
            </button>
            <div className="px-4 py-1 bg-black/40 backdrop-blur-md rounded-full text-sm font-medium">
                {isManual ? 'Enter Asset ID' : 'Scan Asset QR'}
            </div>
            <button onClick={() => setIsManual(!isManual)} className="p-2 bg-black/40 backdrop-blur-md rounded-full hover:bg-white/10 transition-colors">
                {isManual ? <Camera className="w-6 h-6" /> : <Keyboard className="w-6 h-6" />}
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 relative bg-slate-900 overflow-hidden flex items-center justify-center">
             {isManual ? (
                 <form onSubmit={handleManualSubmit} className="w-full max-w-xs px-4 space-y-4">
                     <div className="text-center mb-6">
                         <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                             <Keyboard className="w-8 h-8 text-ams-blue" />
                         </div>
                         <h3 className="text-white font-bold text-xl">Manual Entry</h3>
                         <p className="text-slate-400 text-sm">Enter the alphanumeric code found on the asset tag.</p>
                     </div>
                     <input 
                        autoFocus
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 text-center text-white text-lg tracking-widest font-mono focus:ring-2 focus:ring-ams-blue outline-none uppercase"
                        placeholder="ASSET-ID"
                        value={manualCode}
                        onChange={e => setManualCode(e.target.value)}
                     />
                     <button type="submit" className="w-full py-4 bg-ams-blue text-white font-bold rounded-xl shadow-lg hover:bg-blue-900 transition-all">
                         Identify Asset
                     </button>
                 </form>
             ) : (
                 <>
                    {loading && (
                        <div className="text-white flex flex-col items-center gap-3 absolute z-30">
                            <Loader2 className="w-8 h-8 animate-spin text-ams-blue" />
                            <p className="text-sm font-bold">Starting Camera...</p>
                        </div>
                    )}
                    
                    {hasPermission === false && (
                        <div className="text-white flex flex-col items-center gap-3 px-8 text-center absolute z-30">
                            <AlertCircle className="w-12 h-12 text-red-500" />
                            <p className="font-bold">Camera Access Required</p>
                            <p className="text-sm text-slate-400">{error}</p>
                        </div>
                    )}

                    {/* Hidden canvas for processing */}
                    <canvas ref={canvasRef} className="hidden" />

                    <video 
                        ref={videoRef} 
                        playsInline
                        muted 
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                    
                    {/* Scanner Overlay UI */}
                    {hasPermission === true && !loading && (
                        <div className="relative w-64 h-64 border-2 border-ams-light-blue/50 rounded-3xl z-10 overflow-hidden shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                            {/* Corner Markers */}
                            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-ams-light-blue rounded-tl-xl"></div>
                            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-ams-light-blue rounded-tr-xl"></div>
                            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-ams-light-blue rounded-bl-xl"></div>
                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-ams-light-blue rounded-br-xl"></div>

                            {/* Scan Line */}
                            <div className="absolute top-0 left-0 w-full h-0.5 bg-red-500 shadow-[0_0_15px_rgba(239,68,68,1)] animate-[scan_2s_linear_infinite]"></div>
                        </div>
                    )}
                 </>
             )}
        </div>

        {/* Footer Controls */}
        <div className="bg-black p-8 flex justify-center items-center gap-12 text-white safe-area-bottom">
             <button className="flex flex-col items-center gap-2 opacity-50 hover:opacity-100 transition-opacity">
                <div className="p-4 bg-slate-800 rounded-full">
                    <ImageIcon className="w-6 h-6" />
                </div>
                <span className="text-xs">Gallery</span>
             </button>

             <button onClick={() => {}} className="p-6 bg-white rounded-full border-4 border-slate-300 shadow-lg transform active:scale-95 transition-transform hover:scale-105">
                 <Camera className="w-8 h-8 text-black" />
             </button>

             <div className="w-16"></div> {/* Spacer */}
        </div>
    </div>
  );
};

export default QrScannerModal;
