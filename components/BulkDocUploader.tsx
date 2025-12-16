import React, { useState } from 'react';
import { Upload, X, CheckCircle, AlertTriangle, FileText, Loader2, ArrowRight } from 'lucide-react';
import { MASTER_POLICY_INDEX, PolicyDefinition } from '../data/masterPolicyList';
import { uploadFile } from '../services/storage';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';

interface BulkDocUploaderProps {
    onClose: () => void;
}

interface FileMatch {
    file: File;
    policy: PolicyDefinition;
    status: 'pending' | 'uploading' | 'success' | 'error';
    errorMsg?: string;
}

const BulkDocUploader: React.FC<BulkDocUploaderProps> = ({ onClose }) => {
    const { user } = useAuth();
    const [matches, setMatches] = useState<FileMatch[]>([]);
    const [unmatched, setUnmatched] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        
        const newMatches: FileMatch[] = [];
        const newUnmatched: File[] = [];
        const files = Array.from(e.target.files) as File[];

        files.forEach(file => {
            // Regex to find ID at start of filename e.g. "CG-001"
            const match = file.name.match(/^([A-Z]{2,3}-\d{3})/i);
            if (match) {
                const id = match[1].toUpperCase();
                const policy = MASTER_POLICY_INDEX.find(p => p.id === id);
                if (policy) {
                    newMatches.push({ file, policy, status: 'pending' });
                } else {
                    newUnmatched.push(file);
                }
            } else {
                newUnmatched.push(file);
            }
        });

        setMatches(prev => [...prev, ...newMatches]);
        setUnmatched(prev => [...prev, ...newUnmatched]);
    };

    const startUpload = async () => {
        setIsUploading(true);
        const total = matches.filter(m => m.status === 'pending').length;
        let completed = 0;

        // Process sequentially to be kind to bandwidth and rate limits
        for (let i = 0; i < matches.length; i++) {
            const item = matches[i];
            if (item.status !== 'pending') continue;

            // Update UI to uploading
            setMatches(prev => {
                const next = [...prev];
                next[i].status = 'uploading';
                return next;
            });

            try {
                // 1. Upload File
                const url = await uploadFile(item.file, 'documents/policies');

                // 2. Create Firestore Doc
                await addDoc(collection(db, 'documents'), {
                    title: `${item.policy.id}: ${item.policy.title}`,
                    category: item.policy.category,
                    description: `Official Policy Document. Ref: ${item.policy.id}`,
                    version: '1.0',
                    url: url,
                    lastUpdated: new Date().toISOString(),
                    uploadedBy: user?.name || 'System Bulk Upload'
                });

                // Update UI to success
                setMatches(prev => {
                    const next = [...prev];
                    next[i].status = 'success';
                    return next;
                });

            } catch (e) {
                console.error(e);
                setMatches(prev => {
                    const next = [...prev];
                    next[i].status = 'error';
                    next[i].errorMsg = 'Upload Failed';
                    return next;
                });
            }

            completed++;
            setProgress(Math.round((completed / total) * 100));
        }

        setIsUploading(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                            <FileText className="w-5 h-5 text-ams-blue" /> Smart Bulk Policy Uploader
                        </h3>
                        <p className="text-xs text-slate-500">Auto-matches filenames (e.g. 'CG-001.pdf') to Master Index.</p>
                    </div>
                    <button onClick={onClose} disabled={isUploading} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col p-6">
                    {!isUploading && matches.length === 0 && (
                        <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-12 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors relative cursor-pointer group">
                            <input 
                                type="file" 
                                multiple 
                                accept=".pdf" 
                                className="absolute inset-0 opacity-0 cursor-pointer" 
                                onChange={handleFileSelect} 
                            />
                            <Upload className="w-16 h-16 text-slate-300 group-hover:text-ams-blue mx-auto mb-4 transition-colors" />
                            <h4 className="font-bold text-lg text-slate-700 dark:text-white mb-2">Drag & Drop Policy PDFs Here</h4>
                            <p className="text-sm text-slate-500">
                                Select all 120 files at once. The system will auto-detect IDs (e.g. CG-001).
                            </p>
                        </div>
                    )}

                    {(matches.length > 0 || unmatched.length > 0) && (
                        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                            
                            {/* Summary Bar */}
                            <div className="flex gap-4 mb-4">
                                <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-lg border border-blue-100 dark:border-blue-900/50 text-blue-700 dark:text-blue-300 text-sm font-bold">
                                    {matches.length} Matched Files
                                </div>
                                {unmatched.length > 0 && (
                                    <div className="bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg border border-red-100 dark:border-red-900/50 text-red-700 dark:text-red-300 text-sm font-bold">
                                        {unmatched.length} Unmatched Files (Renaming required)
                                    </div>
                                )}
                            </div>

                            {/* Unmatched List Warning */}
                            {unmatched.length > 0 && (
                                <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl mb-4">
                                    <h5 className="font-bold text-red-800 dark:text-red-200 text-sm mb-2 flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4" /> Files not recognized (Rename to ID-XXX.pdf)
                                    </h5>
                                    <div className="flex flex-wrap gap-2">
                                        {unmatched.map((f, i) => (
                                            <span key={i} className="px-2 py-1 bg-white dark:bg-slate-900 border border-red-100 dark:border-red-900 rounded text-xs text-red-600 dark:text-red-400 font-mono truncate max-w-[200px]" title={f.name}>
                                                {f.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Matched List */}
                            <div className="space-y-2">
                                {matches.map((m, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className={`p-2 rounded-lg ${m.status === 'success' ? 'bg-green-100 text-green-600' : m.status === 'error' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                                                <FileText className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-sm text-slate-800 dark:text-white truncate">
                                                    <span className="font-mono text-slate-500 mr-2">{m.policy.id}</span>
                                                    {m.policy.title}
                                                </p>
                                                <p className="text-xs text-slate-400 truncate">{m.file.name} • {m.policy.category}</p>
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0 ml-4">
                                            {m.status === 'pending' && <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Ready</span>}
                                            {m.status === 'uploading' && <Loader2 className="w-5 h-5 text-ams-blue animate-spin" />}
                                            {m.status === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
                                            {m.status === 'error' && <span className="text-xs font-bold text-red-500">Error</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
                    <div className="flex-1 mr-6">
                        {isUploading && (
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                                <div className="bg-ams-blue h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} disabled={isUploading} className="px-6 py-2.5 font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50">Close</button>
                        {matches.some(m => m.status === 'pending') && (
                            <button onClick={startUpload} disabled={isUploading} className="px-8 py-2.5 bg-ams-blue text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg flex items-center gap-2 disabled:opacity-50">
                                {isUploading ? 'Processing...' : 'Start Bulk Upload'} <ArrowRight className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BulkDocUploader;