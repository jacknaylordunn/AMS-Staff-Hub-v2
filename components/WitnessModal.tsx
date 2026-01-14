
import React, { useState } from 'react';
import { Lock, UserCheck, AlertTriangle, Loader2, Hash } from 'lucide-react';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { hashPin } from '../utils/crypto';

interface WitnessModalProps {
    drugName: string;
    onWitnessConfirmed: (name: string, uid: string, token: string) => void;
    onCancel: () => void;
}

const WitnessModal: React.FC<WitnessModalProps> = ({ drugName, onWitnessConfirmed, onCancel }) => {
    const [badgeNumber, setBadgeNumber] = useState('');
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [verifying, setVerifying] = useState(false);

    const handleVerify = async () => {
        if (!badgeNumber || pin.length !== 4) {
            setError("Please enter Badge Number and 4-digit PIN.");
            return;
        }

        setVerifying(true);
        setError('');

        try {
            // Find user by Employee ID (Badge Number)
            // Note: In a real app, this query might be restricted. Assuming "users" is readable by authenticated staff.
            const q = query(collection(db, 'users'), where('employeeId', '==', badgeNumber), limit(1));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                setError("Badge Number not found.");
                setVerifying(false);
                return;
            }

            const witnessDoc = querySnapshot.docs[0];
            const witnessData = witnessDoc.data();
            
            // Verify PIN
            const hashedInput = await hashPin(pin);

            if (witnessData.pinHash === hashedInput || witnessData.pin === pin) {
                const token = `WITNESS_TOKEN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                onWitnessConfirmed(witnessData.name, witnessDoc.id, token);
            } else {
                setError("Incorrect PIN. Verification failed.");
                setPin('');
            }
        } catch (e) {
            console.error("Verification error", e);
            setError("Verification failed due to network error.");
        } finally {
            setVerifying(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in zoom-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-700">
                <div className="bg-purple-600 p-6 text-white text-center">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Lock className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold">Controlled Drug Witness</h3>
                    <p className="text-purple-200 text-sm mt-1">{drugName}</p>
                </div>
                
                <div className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-lg flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" /> {error}
                        </div>
                    )}

                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Witness Badge / ID</label>
                            <div className="relative">
                                <Hash className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                <input 
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg pl-9 pr-3 py-2.5 font-medium outline-none focus:ring-2 focus:ring-purple-500 dark:text-white h-10 text-sm"
                                    placeholder="e.g. AMS1234"
                                    value={badgeNumber}
                                    onChange={e => setBadgeNumber(e.target.value.toUpperCase())}
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Secure PIN</label>
                            <input 
                                type="password"
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 font-bold tracking-widest outline-none focus:ring-2 focus:ring-purple-500 dark:text-white h-10 text-sm"
                                placeholder="••••"
                                maxLength={4}
                                value={pin}
                                onChange={e => setPin(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button onClick={onCancel} className="flex-1 py-2.5 text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors text-sm">Cancel</button>
                        <button 
                            onClick={handleVerify}
                            disabled={verifying}
                            className="flex-[2] py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                        >
                            {verifying ? <Loader2 className="animate-spin w-4 h-4" /> : <UserCheck className="w-4 h-4" />} Verify
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WitnessModal;
