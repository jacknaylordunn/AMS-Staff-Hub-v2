
import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface SpeechTextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  label: string;
}

const SpeechTextArea: React.FC<SpeechTextAreaProps> = ({ value, onChange, label, className, ...props }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setIsSupported(true);
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-GB';

      rec.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
        }
        if (finalTranscript) {
          // Append to existing text
          const newEvent = {
            target: { value: (value ? value + ' ' : '') + finalTranscript.trim() }
          } as React.ChangeEvent<HTMLTextAreaElement>;
          onChange(newEvent);
        }
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      setRecognition(rec);
    }
  }, [value, onChange]);

  const toggleListening = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
      setIsListening(true);
    }
  };

  return (
    <div className="relative">
      <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex justify-between">
        {label}
        {isSupported && (
           <button 
             onClick={toggleListening}
             type="button"
             className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full transition-colors ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
           >
             {isListening ? <><MicOff className="w-3 h-3" /> Stop Dictation</> : <><Mic className="w-3 h-3" /> Dictate</>}
           </button>
        )}
      </label>
      <div className="relative">
        <textarea
          value={value}
          onChange={onChange}
          className={`w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ams-blue focus:border-transparent outline-none transition-all ${className}`}
          {...props}
        />
        {isListening && (
           <div className="absolute bottom-2 right-2">
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
