import React from 'react';
import { X, CheckCircle, AlertTriangle, AlertOctagon, FileText } from 'lucide-react';

interface AuditSummaryModalProps {
  score: number;
  feedback: string;
  criticalIssues: string[];
  onClose: () => void;
}

const AuditSummaryModal: React.FC<AuditSummaryModalProps> = ({ score, feedback, criticalIssues, onClose }) => {
  
  const getScoreColor = (s: number) => {
      if (s >= 90) return 'text-green-600 bg-green-50 border-green-200';
      if (s >= 70) return 'text-amber-600 bg-amber-50 border-amber-200';
      return 'text-red-600 bg-red-50 border-red-200';
  };

  const getScoreLabel = (s: number) => {
      if (s >= 90) return 'Excellent';
      if (s >= 70) return 'Good Standard';
      return 'Action Required';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-white/20">
        <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
            <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-ams-blue" />
                    AI Clinical Audit
                </h2>
                <p className="text-sm text-slate-500 mt-1">Automated ePRF review against JRCALC standards.</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-400" />
            </button>
        </div>

        <div className="p-6 space-y-6">
            {/* Score Section */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-white shadow-sm">
                <div>
                    <span className="text-sm font-bold text-slate-400 uppercase">Quality Score</span>
                    <div className={`mt-1 text-3xl font-bold ${score >= 90 ? 'text-green-600' : score >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                        {score}/100
                    </div>
                </div>
                <div className={`px-4 py-2 rounded-lg font-bold text-sm border ${getScoreColor(score)}`}>
                    {getScoreLabel(score)}
                </div>
            </div>

            {/* Critical Issues */}
            {criticalIssues.length > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                    <h3 className="text-red-800 font-bold text-sm flex items-center gap-2 mb-3">
                        <AlertOctagon className="w-4 h-4" /> Critical Missing Information
                    </h3>
                    <ul className="space-y-2">
                        {criticalIssues.map((issue, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-red-700">
                                <span className="mt-1.5 w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0" />
                                {issue}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Feedback */}
            <div>
                <h3 className="text-slate-800 font-bold text-sm mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-ams-blue" /> Clinical Feedback
                </h3>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm text-slate-700 leading-relaxed">
                    {feedback}
                </div>
            </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
            <button 
                onClick={onClose}
                className="px-6 py-2 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-colors shadow-lg"
            >
                Acknowledge
            </button>
        </div>
      </div>
    </div>
  );
};

export default AuditSummaryModal;