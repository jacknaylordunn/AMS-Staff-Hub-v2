import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, Loader2, Sparkles } from 'lucide-react';
import { getMedicalGuidance } from '../services/geminiService';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface AiAssistantModalProps {
  onClose: () => void;
  context?: string;
}

const AiAssistantModal: React.FC<AiAssistantModalProps> = ({ onClose, context }) => {
  const [messages, setMessages] = useState<Message[]>([
    { 
        id: 1, 
        text: `JRCALC Clinical Assistant active.\nI have context of your current patient: ${context || 'General'}.\nHow can I help?`, 
        sender: 'ai', 
        timestamp: new Date() 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now(),
      text: input,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const responseText = await getMedicalGuidance(userMsg.text, context);

    const aiMsg: Message = {
      id: Date.now() + 1,
      text: responseText,
      sender: 'ai',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, aiMsg]);
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg h-[600px] flex flex-col overflow-hidden relative border border-white/20">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-ams-blue to-blue-900 text-white flex justify-between items-center shadow-md z-10">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                    <Sparkles className="w-5 h-5 text-ams-gold" />
                </div>
                <div>
                    <h3 className="font-bold text-sm">Clinical Assistant</h3>
                    <p className="text-xs text-blue-200">JRCALC Guidelines • AI Powered</p>
                </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-5 h-5" />
            </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] rounded-2xl p-3 text-sm shadow-sm ${
                  msg.sender === 'user' 
                  ? 'bg-ams-blue text-white rounded-br-none' 
                  : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none'
              }`}>
                <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>
                <p className={`text-[10px] mt-1 text-right ${msg.sender === 'user' ? 'text-blue-200' : 'text-slate-400'}`}>
                  {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
               <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none p-4 shadow-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-ams-blue" />
                  <span className="text-xs text-slate-500 font-medium">Consulting guidelines...</span>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-200">
          <div className="flex gap-2 relative">
            <input
              type="text"
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a clinical question..."
              className="flex-1 pl-4 pr-12 py-3 bg-slate-100 border-transparent focus:bg-white border focus:border-ams-blue rounded-xl outline-none transition-all text-sm"
            />
            <button 
              type="submit" 
              disabled={isLoading || !input.trim()}
              className="absolute right-2 top-2 p-1.5 bg-ams-blue text-white rounded-lg hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-center text-slate-400 mt-2">AI can make mistakes. Verify with physical JRCALC guidelines.</p>
        </form>
      </div>
    </div>
  );
};

export default AiAssistantModal;