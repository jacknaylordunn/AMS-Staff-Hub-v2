
import React, { useState } from 'react';
import { X, Megaphone, Send, AlertTriangle } from 'lucide-react';
import { db } from '../services/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { notifyAllStaff } from '../services/notificationService';

interface AnnouncementModalProps {
  onClose: () => void;
}

const AnnouncementModal: React.FC<AnnouncementModalProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'Normal' | 'Urgent'>('Normal');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'announcements'), {
        title,
        message,
        priority,
        author: user?.name,
        date: Timestamp.now(),
        readBy: []
      });

      // Fan-out Notification
      await notifyAllStaff(
          `Announcement: ${title}`,
          `New ${priority} announcement from ${user?.name}.`,
          priority === 'Urgent' ? 'alert' : 'info',
          '/'
      );

      onClose();
    } catch (error) {
      console.error("Error creating announcement", error);
      alert("Failed to post announcement");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700">
        <div className="p-6 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-ams-blue dark:text-ams-light-blue" /> New Announcement
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500 dark:text-slate-400">
                <X className="w-5 h-5" />
            </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Title</label>
                <input 
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ams-blue dark:text-white"
                    placeholder="e.g. System Maintenance"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    required
                />
            </div>
            
            <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Priority Level</label>
                <div className="flex gap-4">
                    <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${priority === 'Normal' ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>
                        <input type="radio" name="priority" className="hidden" onClick={() => setPriority('Normal')} />
                        <span className="font-bold text-sm">Normal</span>
                    </label>
                    <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${priority === 'Urgent' ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>
                        <input type="radio" name="priority" className="hidden" onClick={() => setPriority('Urgent')} />
                        <AlertTriangle className="w-4 h-4" />
                        <span className="font-bold text-sm">Urgent</span>
                    </label>
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Message</label>
                <textarea 
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ams-blue resize-none h-32 dark:text-white"
                    placeholder="Type your announcement here..."
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    required
                />
            </div>

            <div className="pt-2">
                <button 
                    type="submit" 
                    disabled={submitting}
                    className="w-full py-3 bg-ams-blue hover:bg-blue-900 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {submitting ? 'Posting...' : <><Send className="w-4 h-4" /> Broadcast Now</>}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default AnnouncementModal;
