
import React, { useEffect, useState } from 'react';
import { X, ExternalLink, FileText } from 'lucide-react';

interface DocumentViewerModalProps {
  url: string;
  title?: string;
  onClose: () => void;
}

const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({ url, title, onClose }) => {
  const [fileType, setFileType] = useState<'pdf' | 'image' | 'other'>('other');

  useEffect(() => {
    // Disable background scrolling when modal is open
    document.body.style.overflow = 'hidden';
    
    // Determine file type from URL extension
    // Note: This is a basic check. For signed URLs without extensions, it might default to 'other'
    // which still uses the object/iframe viewer that handles most types well.
    const cleanUrl = url.split('?')[0].toLowerCase();
    if (cleanUrl.match(/\.(jpeg|jpg|gif|png|webp|bmp|svg)$/)) {
        setFileType('image');
    } else if (cleanUrl.match(/\.pdf$/)) {
        setFileType('pdf');
    } else {
        setFileType('other');
    }

    return () => {
      // Re-enable scrolling on cleanup
      document.body.style.overflow = 'unset';
    };
  }, [url]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in zoom-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
             <div className="p-2 bg-ams-blue rounded-lg shrink-0">
                 <FileText className="w-5 h-5 text-white" />
             </div>
             <h3 className="font-bold text-lg text-slate-800 dark:text-white truncate">
                {title || 'Document Viewer'}
             </h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a 
                href={url} 
                target="_blank" 
                rel="noreferrer" 
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 text-xs font-bold transition-colors"
            >
                <ExternalLink className="w-4 h-4" /> Open New Tab
            </a>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        {/* Viewer Content */}
        {fileType === 'image' ? (
            <div className="flex-1 bg-slate-200 dark:bg-black overflow-auto relative">
                <div className="min-h-full flex items-center justify-center p-4">
                    <img 
                        src={url} 
                        alt={title || "Document"} 
                        className="max-w-full h-auto shadow-lg"
                    />
                </div>
            </div>
        ) : (
            <div className="flex-1 bg-slate-200 dark:bg-black relative">
                {/* Object tag often handles PDFs better than iframe on some browsers */}
                <object data={url} type="application/pdf" className="w-full h-full block">
                    <iframe 
                        src={url} 
                        className="w-full h-full border-none block" 
                        title="Document Viewer"
                    />
                </object>
            </div>
        )}
      </div>
    </div>
  );
};

export default DocumentViewerModal;
