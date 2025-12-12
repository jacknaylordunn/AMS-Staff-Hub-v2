
import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, AlertTriangle, Sparkles, Loader2, Info, ChevronRight, BookOpen } from 'lucide-react';
import { createGuidelineChat } from '../services/geminiService';
import { GenerateContentResponse } from "@google/genai";

interface Message {
    id: string;
    role: 'user' | 'model';
    text: string;
    timestamp: Date;
}

const QUICK_PROMPTS = [
    "Sepsis Red Flags (Adult)",
    "Paediatric Cardiac Arrest (5yo)",
    "Stroke Thrombolysis Exclusions",
    "Asthma Life Threatening Signs",
    "Morphine Dosage Adult",
    "Major Trauma Triage Tool"
];

const GuidelineAssistant = () => {
  const [messages, setMessages] = useState<Message[]>([
      {
          id: 'init',
          role: 'model',
          text: "Hello. I am Aegis-AI, your JRCALC-aligned clinical assistant. I can help with dosages, checklists, and safety flags.\n\n**Warning:** I am an AI support tool. Always verify with official guidelines.",
          timestamp: new Date()
      }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatSession, setChatSession] = useState<any>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      // Initialize chat session
      const chat = createGuidelineChat();
      setChatSession(chat);
  }, []);

  useEffect(() => {
      scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (textOverride?: string) => {
      const textToSend = textOverride || input;
      if (!textToSend.trim() || !chatSession) return;

      const userMsg: Message = {
          id: Date.now().toString(),
          role: 'user',
          text: textToSend,
          timestamp: new Date()
      };

      setMessages(prev => [...prev, userMsg]);
      setInput('');
      setLoading(true);

      try {
          // Streaming response for better UX
          let fullResponse = "";
          const modelMsgId = (Date.now() + 1).toString();
          
          // Add placeholder for model response
          setMessages(prev => [...prev, {
              id: modelMsgId,
              role: 'model',
              text: "",
              timestamp: new Date()
          }]);

          const result = await chatSession.sendMessageStream({ message: textToSend });
          
          for await (const chunk of result) {
              const c = chunk as GenerateContentResponse;
              const text = c.text;
              if (text) {
                  fullResponse += text;
                  setMessages(prev => prev.map(m => 
                      m.id === modelMsgId ? { ...m, text: fullResponse } : m
                  ));
              }
          }
      } catch (e) {
          console.error("Chat error", e);
          setMessages(prev => [...prev, {
              id: Date.now().toString(),
              role: 'model',
              text: "⚠️ Connection error. Please check your internet and try again.",
              timestamp: new Date()
          }]);
      } finally {
          setLoading(false);
      }
  };

  // Simple Markdown-ish parser for bold text and newlines
  const formatText = (text: string) => {
      return text.split('\n').map((line, i) => (
          <p key={i} className={`min-h-[1rem] ${line.trim().startsWith('-') || line.trim().startsWith('•') ? 'pl-4' : ''}`}>
              {line.split(/(\*\*.*?\*\*)/).map((part, j) => {
                  if (part.startsWith('**') && part.endsWith('**')) {
                      return <strong key={j} className="text-ams-blue dark:text-blue-400">{part.slice(2, -2)}</strong>;
                  }
                  return part;
              })}
          </p>
      ));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] max-w-4xl mx-auto">
        {/* Warning Banner */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 rounded-xl mb-4 flex items-center gap-3 text-xs text-amber-800 dark:text-amber-200 shrink-0">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <p><strong>Clinical Safety Notice:</strong> AI responses may vary. This tool does not replace professional judgement. Verify critical calculations.</p>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto space-y-4 p-2 custom-scrollbar">
            {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'model' && (
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0 mt-1">
                            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                    )}
                    
                    <div className={`max-w-[85%] md:max-w-[75%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                        msg.role === 'user' 
                        ? 'bg-ams-blue text-white rounded-br-none' 
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-bl-none border border-slate-200 dark:border-slate-700'
                    }`}>
                        {formatText(msg.text)}
                        <div className={`text-[10px] mt-2 opacity-50 text-right ${msg.role === 'user' ? 'text-blue-100' : 'text-slate-400'}`}>
                            {msg.timestamp.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                        </div>
                    </div>

                    {msg.role === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 mt-1">
                            <User className="w-4 h-4 text-slate-500 dark:text-slate-300" />
                        </div>
                    )}
                </div>
            ))}
            {loading && (
                <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0">
                        <Loader2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-spin" />
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl rounded-bl-none flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-200"></span>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="mt-4 shrink-0 space-y-4">
            {/* Quick Prompts */}
            {messages.length < 3 && (
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {QUICK_PROMPTS.map(prompt => (
                        <button 
                            key={prompt}
                            onClick={() => handleSend(prompt)}
                            disabled={loading}
                            className="whitespace-nowrap px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:border-ams-blue transition-colors"
                        >
                            {prompt}
                        </button>
                    ))}
                </div>
            )}

            <div className="relative">
                <form 
                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                    className="flex gap-2 items-end bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm focus-within:ring-2 focus-within:ring-ams-blue focus-within:border-transparent transition-all"
                >
                    <textarea 
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                        placeholder="Ask clinical question (e.g. 'Morphine contraindications')..."
                        className="w-full bg-transparent border-none focus:ring-0 resize-none max-h-32 min-h-[44px] py-2.5 px-2 text-sm dark:text-white"
                        rows={1}
                        disabled={loading}
                    />
                    <button 
                        type="submit"
                        disabled={!input.trim() || loading}
                        className="p-2.5 bg-ams-blue text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-ams-blue transition-colors shadow-sm mb-0.5"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                </form>
            </div>
        </div>
    </div>
  );
};

export default GuidelineAssistant;
