
import React, { useState, useEffect } from 'react';
import { Pill, Plus, AlertTriangle, Lock, RefreshCcw, History, Loader2, ArrowRightLeft, Trash2, CheckCircle, FileText, Syringe, Search, Filter } from 'lucide-react';
import { db } from '../services/firebase';
import { collection, onSnapshot, addDoc, query, orderBy, Timestamp, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import WitnessModal from '../components/WitnessModal';
import { CONTROLLED_DRUGS } from '../data/drugDatabase';

// ... (Interfaces omitted for brevity)
interface StockItem { id: string; name: string; strength: string; unit: string; currentStock: number; minLevel: number; class: string; batchNumber?: string; expiryDate?: string; }
interface Transaction { id: string; timestamp: string; type: 'Receive' | 'Administer' | 'Waste' | 'Check' | 'Move'; drugName: string; amount: number; balanceAfter: number; user: string; witness?: string; notes?: string; }

const DrugsPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'Stock' | 'Audit'>('Stock');
  const [stock, setStock] = useState<StockItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionType, setTransactionType] = useState<'Receive' | 'Waste' | 'Check' | 'Move' | 'Administer'>('Receive');
  const [selectedDrug, setSelectedDrug] = useState<StockItem | null>(null);
  const [txAmount, setTxAmount] = useState<number | ''>('');
  const [txNotes, setTxNotes] = useState('');
  const [txBatch, setTxBatch] = useState('');
  const [txExpiry, setTxExpiry] = useState('');
  const [showWitness, setShowWitness] = useState(false);
  const [witnessData, setWitnessData] = useState<{name: string, uid: string} | null>(null);

  useEffect(() => {
    const unsubStock = onSnapshot(collection(db, 'stock'), (snap) => { setStock(snap.docs.map(d => ({ id: d.id, ...d.data() } as StockItem))); setLoading(false); });
    const q = query(collection(db, 'drug_audit'), orderBy('timestamp', 'desc'));
    const unsubTx = onSnapshot(q, (snap) => { setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data(), timestamp: d.data().timestamp.toDate().toLocaleString() } as Transaction))); });
    return () => { unsubStock(); unsubTx(); };
  }, []);

  const initiateTransaction = (type: typeof transactionType, drug?: StockItem) => { setTransactionType(type); if (drug) setSelectedDrug(drug); setTxAmount(''); setTxNotes(''); setTxBatch(''); setTxExpiry(''); setWitnessData(null); setShowTransactionModal(true); };
  const handleWitnessConfirmed = (name: string, uid: string) => { setWitnessData({ name, uid }); setShowWitness(false); handleSubmitTransaction(name); };
  const validateAndSubmit = () => { if (!selectedDrug || !txAmount) return; const needsWitness = (transactionType === 'Waste' || transactionType === 'Check') && CONTROLLED_DRUGS.includes(selectedDrug.name); if (needsWitness && !witnessData) { setShowWitness(true); } else { handleSubmitTransaction(); } };
  const handleSubmitTransaction = async (witnessName?: string) => {
      if (!selectedDrug || !user) return;
      let newBalance = selectedDrug.currentStock; const amount = Number(txAmount);
      switch(transactionType) { case 'Receive': newBalance += amount; break; case 'Administer': newBalance -= amount; break; case 'Waste': newBalance -= amount; break; case 'Move': newBalance -= amount; break; case 'Check': newBalance = amount; break; }
      const finalWitness = witnessName || witnessData?.name;
      try {
          await updateDoc(doc(db, 'stock', selectedDrug.id), { currentStock: newBalance, ...(txBatch ? { batchNumber: txBatch } : {}), ...(txExpiry ? { expiryDate: txExpiry } : {}) });
          await addDoc(collection(db, 'drug_audit'), { timestamp: Timestamp.now(), type: transactionType, drugName: selectedDrug.name, amount: amount, balanceAfter: newBalance, user: user.name, userId: user.uid, witness: finalWitness || null, notes: txNotes || (transactionType === 'Check' && amount !== selectedDrug.currentStock ? `Discrepancy corrected. Old: ${selectedDrug.currentStock}` : null) });
          alert("Transaction logged successfully."); setShowTransactionModal(false); setWitnessData(null);
      } catch (e) { console.error("Tx Error", e); alert("Failed to process transaction."); }
  };

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-ams-blue" /></div>;

  return (
    <div className="space-y-6">
      {/* ... (Header/Tabs omitted for brevity, similar to before) ... */}

      {/* Transaction Modal */}
      {showTransactionModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in zoom-in duration-200">
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 w-full max-w-md border border-slate-300 dark:border-slate-600">
                  {/* ... Header ... */}
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                      {transactionType} Stock
                  </h3>
                  
                  <div className="space-y-5">
                      {!selectedDrug ? (
                          <div>
                              <label className="input-label">Select Drug</label>
                              <select className="input-field h-12" onChange={e => setSelectedDrug(stock.find(s => s.id === e.target.value) || null)}>
                                  <option value="">-- Select --</option>
                                  {stock.map(s => <option key={s.id} value={s.id}>{s.name} ({s.currentStock})</option>)}
                              </select>
                          </div>
                      ) : (
                          <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                              <div><span className="font-bold text-slate-800 dark:text-white block text-lg">{selectedDrug.name}</span><span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">{selectedDrug.strength}</span></div>
                              <span className="text-sm bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 font-mono font-bold dark:text-white">Qty: {selectedDrug.currentStock}</span>
                          </div>
                      )}

                      <div>
                          <label className="input-label">{transactionType === 'Check' ? 'Counted Total' : 'Amount'} ({selectedDrug?.unit || 'Units'})</label>
                          <input type="number" className="input-field text-2xl font-bold text-center h-16" value={txAmount} onChange={e => setTxAmount(Number(e.target.value))} placeholder="0" autoFocus />
                      </div>

                      {transactionType === 'Receive' && (
                          <div className="grid grid-cols-2 gap-4">
                              <div><label className="input-label">Batch No.</label><input className="input-field font-mono" value={txBatch} onChange={e => setTxBatch(e.target.value)} /></div>
                              <div><label className="input-label">Expiry</label><input type="date" className="input-field" value={txExpiry} onChange={e => setTxExpiry(e.target.value)} /></div>
                          </div>
                      )}

                      <div>
                          <label className="input-label">Notes / Reason</label>
                          <textarea className="input-field" rows={2} value={txNotes} onChange={e => setTxNotes(e.target.value)} placeholder={transactionType === 'Waste' ? 'Reason for wastage...' : 'Optional notes...'} />
                      </div>

                      <div className="flex gap-3 pt-4">
                          <button onClick={() => setShowTransactionModal(false)} className="flex-1 py-3 text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors">Cancel</button>
                          <button onClick={validateAndSubmit} disabled={!selectedDrug || !txAmount} className="flex-1 py-3 bg-ams-blue text-white font-bold rounded-xl hover:bg-blue-900 shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">{transactionType === 'Check' ? 'Confirm Count' : 'Submit'}</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Witness Modal */}
      {showWitness && selectedDrug && (
          <WitnessModal drugName={selectedDrug.name} onWitnessConfirmed={handleWitnessConfirmed} onCancel={() => setShowWitness(false)} />
      )}

      <style>{`
        .input-label { @apply block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5 ml-1; }
        .input-field { @apply w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ams-blue focus:border-transparent transition-all dark:text-white font-medium shadow-sm; }
        .action-btn { @apply flex flex-col items-center justify-center p-3 rounded-xl text-xs font-bold border transition-all hover:scale-105 active:scale-95 shadow-sm; }
      `}</style>
    </div>
  );
};

export default DrugsPage;
