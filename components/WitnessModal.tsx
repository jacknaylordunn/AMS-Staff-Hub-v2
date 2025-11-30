
import React, { useState, useEffect } from 'react';
import { Lock, UserCheck, AlertTriangle, Loader2 } from 'lucide-react';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { User } from '../types';

interface WitnessModalProps {
    drugName: string;
    onWitnessConfirmed: (name: string, uid: string) => void;
    onCancel: () => void;
}

const WitnessModal: React.FC<WitnessModalProps> = ({ drugName, onWitnessConfirmed, onCancel }) => {
    const [selectedWitnessId, setSelectedWitnessId] = useState('');
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [activeStaff, setActiveStaff] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);

    // 1. Fetch Staff List (Names ONLY)
    useEffect(() => {
        const fetchStaff = async () => {
            try {
                const q = query(collection(db, 'users'), where('status', '==', 'Active'));
                const snapshot = await getDocs(q);
                // Map only public info, do NOT map 'pin'
                const users = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return { uid: doc.id, name: data.name, role: data.role } as User;
                });
                setActiveStaff(users);
            } catch (e) {
                console.error("Error loading staff", e);
                setError("Failed to load staff list.");
            } finally {
                setLoading(false);
            }
        };
        fetchStaff();
    }, []);

    const handleVerify = async () => {
        if (!selectedWitnessId || pin.length !== 4) {
            setError("Please select a witness and enter a 4-digit PIN.");
            return;
        }

        setVerifying(true);
        setError('');

        try {
            // 2. On-Demand Fetch: Get the specific witness doc to check PIN
            const witnessRef = doc(db, 'users', selectedWitnessId);
            const witnessSnap = await getDoc(witnessRef);

            if (witnessSnap.exists()) {
                const witnessData = witnessSnap.data();
                // Check against the PIN in the database
                if (witnessData.pin === pin) {
                    onWitnessConfirmed(witnessData.name, selectedWitnessId);
                } else {
                    setError("Incorrect PIN. Verification failed.");
                    setPin('');
                }
            } else {
                setError("Witness profile not found.");
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

                    {loading ? (
                        <div className="flex justify-center p-4"><Loader2 className="animate-spin text-purple-600" /></div>
                    ) : (
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Select Witness</label>
                                <select 
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-3 font-medium outline-none focus:ring-2 focus:ring-purple-500 dark:text-white"
                                    value={selectedWitnessId}
                                    onChange={e => setSelectedWitnessId(e.target.value)}
                                >
                                    <option value="">-- Choose Clinician --</option>
                                    {activeStaff.map(s => (
                                        <option key={s.uid} value={s.uid}>{s.name} ({s.role})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Secure PIN</label>
                                <input 
                                    type="password"
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-3 font-bold tracking-widest outline-none focus:ring-2 focus:ring-purple-500 dark:text-white"
                                    placeholder="••••"
                                    maxLength={4}
                                    value={pin}
                                    onChange={e => setPin(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button onClick={onCancel} className="flex-1 py-3 text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">Cancel</button>
                        <button 
                            onClick={handleVerify}
                            disabled={verifying}
                            className="flex-[2] py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {verifying ? <Loader2 className="animate-spin w-5 h-5" /> : <UserCheck className="w-5 h-5" />} Verify
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WitnessModal;
