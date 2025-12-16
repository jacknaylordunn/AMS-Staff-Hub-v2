
import React, { useState } from 'react';
import { X, Smartphone, Globe, Mail, HelpCircle, Download, Monitor, User, Calendar, Truck, FileText, WifiOff, Lock, Clock, Ghost, Upload, KeyRound, BookOpen, MapPin } from 'lucide-react';

interface HelpModalProps {
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  const [activeSection, setActiveSection] = useState<'Install' | 'Support'>('Support');

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
            <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-ams-blue" /> Help & Support
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            </button>
        </div>

        <div className="flex border-b border-slate-200 dark:border-slate-700">
            <button 
                onClick={() => setActiveSection('Support')}
                className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeSection === 'Support' ? 'border-ams-blue text-ams-blue' : 'border-transparent text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900'}`}
            >
                Support
            </button>
            <button 
                onClick={() => setActiveSection('Install')}
                className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeSection === 'Install' ? 'border-ams-blue text-ams-blue' : 'border-transparent text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900'}`}
            >
                Install App
            </button>
        </div>

        <div className="p-6 overflow-y-auto">
            {activeSection === 'Install' && (
                <div className="space-y-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl text-sm text-blue-800 dark:text-blue-200 flex gap-3 items-start">
                        <Download className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <p>Aegis Staff Hub is a Progressive Web App (PWA). You can install it on your home screen for a full-screen, app-like experience.</p>
                    </div>

                    <div className="space-y-4">
                        <div className={`p-4 rounded-xl border ${isIOS ? 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700' : 'bg-white border-slate-100 dark:bg-slate-900/50'}`}>
                            <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-2">
                                <Smartphone className="w-4 h-4" /> iOS (iPhone/iPad)
                            </h4>
                            <ol className="list-decimal pl-5 text-sm text-slate-600 dark:text-slate-400 space-y-1">
                                <li>Tap the <strong>Share</strong> button (Square with arrow) in Safari.</li>
                                <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
                                <li>Tap <strong>Add</strong> in the top right corner.</li>
                            </ol>
                        </div>

                        <div className={`p-4 rounded-xl border ${isAndroid ? 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700' : 'bg-white border-slate-100 dark:bg-slate-900/50'}`}>
                            <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-2">
                                <Monitor className="w-4 h-4" /> Android (Chrome)
                            </h4>
                            <ol className="list-decimal pl-5 text-sm text-slate-600 dark:text-slate-400 space-y-1">
                                <li>Tap the <strong>Menu</strong> button (Three dots) in Chrome.</li>
                                <li>Tap <strong>Install App</strong> or <strong>Add to Home screen</strong>.</li>
                                <li>Follow the prompts to install.</li>
                            </ol>
                        </div>
                    </div>
                </div>
            )}

            {activeSection === 'Support' && (
                <div className="space-y-6">
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-slate-500 uppercase">Contact Information</h4>
                        <a href="mailto:IT-support@aegismedicalsolutions.co.uk" className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group">
                            <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-sm text-ams-blue">
                                <Mail className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-bold text-slate-800 dark:text-white text-sm group-hover:text-ams-blue transition-colors">IT Support</p>
                                <p className="text-xs text-slate-500">IT-support@aegismedicalsolutions.co.uk</p>
                            </div>
                        </a>
                        
                        <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                            <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-sm text-green-600">
                                <Globe className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-bold text-slate-800 dark:text-white text-sm">System Status</p>
                                <p className="text-xs text-slate-500">All Systems Operational</p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm font-bold text-slate-500 uppercase mb-3">Frequently Asked Questions</h4>
                        <div className="space-y-2">
                            <details className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden group">
                                <summary className="p-3 text-sm font-medium cursor-pointer flex justify-between items-center text-slate-700 dark:text-slate-300">
                                    <span className="flex items-center gap-2"><User className="w-4 h-4 text-slate-400" /> How do I add a Profile Picture?</span>
                                </summary>
                                <div className="p-3 pt-0 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50">
                                    Go to your <strong>Profile</strong> page. Tap the camera icon on your avatar (circle with initials) to upload a photo.
                                </div>
                            </details>
                            
                            <details className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden group">
                                <summary className="p-3 text-sm font-medium cursor-pointer flex justify-between items-center text-slate-700 dark:text-slate-300">
                                    <span className="flex items-center gap-2"><KeyRound className="w-4 h-4 text-slate-400" /> What if I forget my password?</span>
                                </summary>
                                <div className="p-3 pt-0 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50">
                                    On the Login screen, click "Forgot Password?". Enter your email address to receive a reset link. If you forget your PIN, go to your Profile page while logged in to reset it.
                                </div>
                            </details>

                            <details className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden group">
                                <summary className="p-3 text-sm font-medium cursor-pointer flex justify-between items-center text-slate-700 dark:text-slate-300">
                                    <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-400" /> How do I book holiday/unavailable?</span>
                                </summary>
                                <div className="p-3 pt-0 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50">
                                    Go to the <strong>Rota</strong> page. Click "My Availability" (top right). Add your dates and reason. Managers will see this when scheduling.
                                </div>
                            </details>

                            <details className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden group">
                                <summary className="p-3 text-sm font-medium cursor-pointer flex justify-between items-center text-slate-700 dark:text-slate-300">
                                    <span className="flex items-center gap-2"><Truck className="w-4 h-4 text-slate-400" /> How do I perform a Vehicle Check?</span>
                                </summary>
                                <div className="p-3 pt-0 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50">
                                    From the Dashboard, click <strong>Perform Check</strong> (Green button). This opens the scanner. Scan the vehicle QR code or enter its ID manually to start the checklist.
                                </div>
                            </details>

                            <details className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden group">
                                <summary className="p-3 text-sm font-medium cursor-pointer flex justify-between items-center text-slate-700 dark:text-slate-300">
                                    <span className="flex items-center gap-2"><FileText className="w-4 h-4 text-slate-400" /> How do I create a new ePRF?</span>
                                </summary>
                                <div className="p-3 pt-0 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50">
                                    Go to the <strong>ePRF Records</strong> page. If you are on an active shift, select it from the list to link the record. Otherwise, click 'Emergency / No Shift' to start a standalone record.
                                </div>
                            </details>

                            <details className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden group">
                                <summary className="p-3 text-sm font-medium cursor-pointer flex justify-between items-center text-slate-700 dark:text-slate-300">
                                    <span className="flex items-center gap-2"><WifiOff className="w-4 h-4 text-slate-400" /> Can I use the app offline?</span>
                                </summary>
                                <div className="p-3 pt-0 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50">
                                    Yes. The app works offline. ePRFs, assets, and logs are saved locally. When you regain connection, an indicator will appear, and data will sync automatically to the cloud.
                                </div>
                            </details>

                            <details className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden group">
                                <summary className="p-3 text-sm font-medium cursor-pointer flex justify-between items-center text-slate-700 dark:text-slate-300">
                                    <span className="flex items-center gap-2"><Lock className="w-4 h-4 text-slate-400" /> How do I witness a Controlled Drug?</span>
                                </summary>
                                <div className="p-3 pt-0 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50">
                                    When a clinician administers a CD, they will be prompted to 'Verify Witness'. You must select your name from the list and enter your 4-digit PIN to digitally sign as the witness.
                                </div>
                            </details>

                            <details className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden group">
                                <summary className="p-3 text-sm font-medium cursor-pointer flex justify-between items-center text-slate-700 dark:text-slate-300">
                                    <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-slate-400" /> How do I clock in?</span>
                                </summary>
                                <div className="p-3 pt-0 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50">
                                    On the <strong>Dashboard</strong>, look for the 'Clock In' button or your next shift card. The system checks your GPS location against the base/site location before allowing clock-in.
                                </div>
                            </details>

                            <details className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden group">
                                <summary className="p-3 text-sm font-medium cursor-pointer flex justify-between items-center text-slate-700 dark:text-slate-300">
                                    <span className="flex items-center gap-2"><Ghost className="w-4 h-4 text-slate-400" /> Is the Vent Box really anonymous?</span>
                                </summary>
                                <div className="p-3 pt-0 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50">
                                    Yes. When you submit to the Vent Box, your User ID is stripped from the data payload before it reaches the database. Management sees the message content but not the author.
                                </div>
                            </details>

                            <details className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden group">
                                <summary className="p-3 text-sm font-medium cursor-pointer flex justify-between items-center text-slate-700 dark:text-slate-300">
                                    <span className="flex items-center gap-2"><Upload className="w-4 h-4 text-slate-400" /> How do I upload compliance docs?</span>
                                </summary>
                                <div className="p-3 pt-0 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50">
                                    Go to your <strong>Profile</strong>. Click "Upload New" in the Compliance Documents section. Select the type (e.g., DBS, License) and upload the file. It will be marked 'Pending' until a manager approves it.
                                </div>
                            </details>

                            <details className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden group">
                                <summary className="p-3 text-sm font-medium cursor-pointer flex justify-between items-center text-slate-700 dark:text-slate-300">
                                    <span className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-slate-400" /> How do I check my CPD hours?</span>
                                </summary>
                                <div className="p-3 pt-0 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50">
                                    Go to the <strong>CPD Portfolio</strong> page. The dashboard at the top shows your total logged hours and progress towards your annual target.
                                </div>
                            </details>

                            <details className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden group">
                                <summary className="p-3 text-sm font-medium cursor-pointer flex justify-between items-center text-slate-700 dark:text-slate-300">
                                    <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-400" /> Who sees my location?</span>
                                </summary>
                                <div className="p-3 pt-0 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50">
                                    Your location is only recorded when you perform specific actions like <strong>Clocking In/Out</strong>, performing a <strong>Vehicle Check</strong>, or submitting an <strong>ePRF</strong>. It is not tracked continuously in the background.
                                </div>
                            </details>

                            <details className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden group">
                                <summary className="p-3 text-sm font-medium cursor-pointer flex justify-between items-center text-slate-700 dark:text-slate-300">
                                    How do I reset my PIN?
                                </summary>
                                <div className="p-3 pt-0 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50">
                                    Go to your Profile page and look for the 'Digital ID' card. Click on 'Reset PIN'.
                                </div>
                            </details>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
