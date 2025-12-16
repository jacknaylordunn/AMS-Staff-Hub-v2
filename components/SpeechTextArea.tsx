
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff } from 'lucide-react';

interface SpeechTextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  label: string;
}

const SpeechTextArea: React.FC<SpeechTextAreaProps> = ({ value, onChange, label, className, ...props }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Use a ref to track the latest value without triggering re-renders in the effect
  const valueRef = useRef(value);
  useEffect(() => { valueRef.current = value; }, [value]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setIsSupported(true);
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const rec = new SpeechRecognition();
      rec.continuous = false; // Changed to false to prevent infinite loops/freezes
      rec.interimResults = false; // Only process final results for performance
      rec.lang = 'en-GB';

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
            // Append to current value properly
            const currentValue = valueRef.current || '';
            const newValue = currentValue ? `${currentValue} ${transcript}` : transcript;
            
            // Create synthetic event
            const syntheticEvent = {
                target: { value: newValue }
            } as React.ChangeEvent<HTMLTextAreaElement>;
            
            onChange(syntheticEvent);
        }
        setIsListening(false);
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, [onChange]);

  const toggleListening = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  return (
    <div className="relative">
      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 flex justify-between items-center">
        {label}
        {isSupported && (
           <button 
             onClick={toggleListening}
             type="button"
             className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full transition-colors font-bold border ${isListening ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
           >
             {isListening ? <><MicOff className="w-3 h-3" /> Stop Dictation</> : <><Mic className="w-3 h-3" /> Dictate</>}
           </button>
        )}
      </label>
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={onChange}
          className={`w-full input-field resize-none ${className}`}
          {...props}
        />
        {isListening && (
           <div className="absolute bottom-2 right-2 pointer-events-none">
             <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
             </span>
           </div>
        )}
      </div>
    </div>
  );
};

export default SpeechTextArea;
