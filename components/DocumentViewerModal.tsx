
import React, { useEffect, useState } from 'react';
import { X, ExternalLink, FileText, Mail, Download } from 'lucide-react';

interface DocumentViewerModalProps {
  url: string;
  title?: string;
  onClose: () => void;
  docType?: 'safeguarding' | 'referral' | 'standard';
}

const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({ url, title, onClose, docType = 'standard' }) => {
  const [fileType, setFileType] = useState<'pdf' | 'image' | 'other'>('other');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    
    const cleanUrl = url.split('?')[0].toLowerCase();
    if (cleanUrl.match(/\.(jpeg|jpg|gif|png|webp|bmp|svg)$/)) {
        setFileType('image');
    } else if (cleanUrl.match(/\.pdf$/) || url.startsWith('blob:')) {
        setFileType('pdf');
    } else {
        setFileType('other');
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [url]);

  const handleEmail = () => {
      let email = '';
      let subject = '';
      let body = '';

      if (docType === 'safeguarding') {
          email = 'safeguarding-referrals@aegismedicalsolutions.co.uk';
          subject = `Safeguarding Referral - [Reference]`;
          body = `Please find attached the Safeguarding Referral for the recent incident.\n\nIMPORTANT: You must manually attach the downloaded PDF to this email before sending.`;
      } else if (docType === 'referral') {
          email = 'GP-referrals@aegismedicalsolutions.co.uk';
          subject = `GP Referral Letter - [Patient Name]`;
          body = `Please find attached the Clinical Referral Letter.\n\nIMPORTANT: You must manually attach the downloaded PDF to this email before sending.`;
      }

      if (email) {
          window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
      }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in zoom-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
             <div className="p-2 bg-ams-blue rounded-lg shrink-0">
                 <FileText className="w-5 h-5 text-white" />
             </div>
             <div>
                 <h3 className="font-bold text-lg text-slate-800 dark:text-white truncate">
                    {title || 'Document Viewer'}
                 </h3>
                 {docType !== 'standard' && <p className="text-xs text-red-500 font-bold uppercase">{docType} Document</p>}
             </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {docType !== 'standard' && (
                <button 
                    onClick={handleEmail}
                    className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg text-xs font-bold transition-colors"
                >
                    <Mail className="w-4 h-4" /> Send Email
                </button>
            )}
            
            <a 
                href={url} 
                download={title ? `${title}.pdf` : 'document.pdf'}
                target="_blank" 
                rel="noreferrer" 
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 text-xs font-bold transition-colors"
            >
                <Download className="w-4 h-4" /> Download
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
