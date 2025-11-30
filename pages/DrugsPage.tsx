
import React, { useState, useEffect } from 'react';
import { Pill, Plus, AlertTriangle, Lock, RefreshCcw, History, Loader2, ArrowRightLeft, Trash2, CheckCircle, FileText, Syringe, Search, Filter } from 'lucide-react';
import { db } from '../services/firebase';
import { collection, onSnapshot, addDoc, query, orderBy, Timestamp, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import WitnessModal from '../components/WitnessModal';
import { CONTROLLED_DRUGS } from '../data/drugDatabase';
import { logAuditAction } from '../services/auditService';

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
      
      const transactionDetails = { 
          timestamp: Timestamp.now(), 
          type: transactionType, 
          drugName: selectedDrug.name, 
          amount: amount, 
          balanceAfter: newBalance, 
          user: user.name, 
          userId: user.uid, 
          witness: finalWitness || null, 
          notes: txNotes || (transactionType === 'Check' && amount !== selectedDrug.currentStock ? `Discrepancy corrected. Old: ${selectedDrug.currentStock}` : null) 
      };

      try {
          await updateDoc(doc(db, 'stock', selectedDrug.id), { currentStock: newBalance, ...(txBatch ? { batchNumber: txBatch } : {}), ...(txExpiry ? { expiryDate: txExpiry } : {}) });
          await addDoc(collection(db, 'drug_audit'), transactionDetails);
          
          // Log to centralized audit service as well for CQC
          await logAuditAction(
              user.uid, 
              user.name, 
              `Drug ${transactionType}`, 
              `${selectedDrug.name} x${amount} (New Bal: ${newBalance}). Witness: ${finalWitness || 'N/A'}.`, 
              'Drug'
          );

          alert("Transaction logged successfully."); setShowTransactionModal(false); setWitnessData(null);
      } catch (e) { console.error("Tx Error", e); alert("Failed to process transaction."); }
  };

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-ams-blue" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Controlled Drug Register</h1>
              <p className="text-slate-500 dark:text-slate-400">Stock management and legal audit trail.</p>
          </div>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              <button onClick={() => setActiveTab('Stock')} className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'Stock' ? 'bg-white dark:bg-slate-700 shadow text-ams-blue' : 'text-slate-500'}`}>Current Stock</button>
              <button onClick={() => setActiveTab('Audit')} className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'Audit' ? 'bg-white dark:bg-slate-700 shadow text-ams-blue' : 'text-slate-500'}`}>Audit Trail</button>
          </div>
      </div>

      {activeTab === 'Stock' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                          <tr>
                              <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 uppercase text-xs">Item Name</th>
                              <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 uppercase text-xs">Strength</th>
                              <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 uppercase text-xs text-center">Stock Level</th>
                              <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 uppercase text-xs">Status</th>
                              <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 uppercase text-xs text-right">Actions</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {stock.map(item => (
                              <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                  <td className="px-6 py-4 font-bold text-slate-800 dark:text-white">
                                      {item.name}
                                      {CONTROLLED_DRUGS.includes(item.name) && <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] rounded border border-red-200">CD</span>}
                                  </td>
                                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{item.strength}</td>
                                  <td className="px-6 py-4 text-center">
                                      <span className={`px-3 py-1 rounded-full font-bold font-mono ${item.currentStock <= item.minLevel ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                          {item.currentStock}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4">
                                      {item.currentStock <= item.minLevel ? 
                                          <span className="text-red-600 font-bold text-xs flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Low Stock</span> : 
                                          <span className="text-green-600 font-bold text-xs flex items-center gap-1"><CheckCircle className="w-3 h-3" /> OK</span>
                                      }
                                  </td>
                                  <td className="px-6 py-4">
                                      <div className="flex justify-end gap-2">
                                          <button onClick={() => initiateTransaction('Administer', item)} className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 rounded-lg transition-colors" title="Administer"><Syringe className="w-4 h-4" /></button>
                                          <button onClick={() => initiateTransaction('Receive', item)} className="p-2 hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 rounded-lg transition-colors" title="Restock"><Plus className="w-4 h-4" /></button>
                                          <button onClick={() => initiateTransaction('Check', item)} className="p-2 hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-600 rounded-lg transition-colors" title="Stock Check"><RefreshCcw className="w-4 h-4" /></button>
                                      </div>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {activeTab === 'Audit' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
                  <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm uppercase">Transaction Log</h3>
                  <button className="text-xs text-ams-blue font-bold flex items-center gap-1"><FileText className="w-3 h-3" /> Export Report</button>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {transactions.map(tx => (
                      <div key={tx.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                          <div className="flex justify-between items-start mb-1">
                              <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                      tx.type === 'Administer' ? 'bg-blue-100 text-blue-700' :
                                      tx.type === 'Receive' ? 'bg-green-100 text-green-700' :
                                      tx.type === 'Waste' ? 'bg-red-100 text-red-700' : 
                                      'bg-amber-100 text-amber-700'
                                  }`}>{tx.type}</span>
                                  <span className="font-bold text-slate-800 dark:text-white text-sm">{tx.drugName}</span>
                              </div>
                              <span className="text-xs text-slate-400 font-mono">{tx.timestamp}</span>
                          </div>
                          <div className="flex justify-between items-end text-xs text-slate-500 dark:text-slate-400">
                              <div>
                                  <p>Amount: <strong>{tx.amount}</strong> • Balance: <strong>{tx.balanceAfter}</strong></p>
                                  <p>User: {tx.user} {tx.witness && <span className="text-purple-600 font-bold ml-1">• Witness: {tx.witness}</span>}</p>
                                  {tx.notes && <p className="mt-1 italic text-slate-400">"{tx.notes}"</p>}
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

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
