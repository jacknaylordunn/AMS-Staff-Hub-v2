

import React, { useState, useEffect } from 'react';
import { Pill, Plus, AlertTriangle, Lock, RefreshCcw, History, Loader2, ArrowRightLeft, Trash2, CheckCircle, FileText, Syringe, Search, Filter, ClipboardCheck, BellRing } from 'lucide-react';
import { db } from '../services/firebase';
import { collection, onSnapshot, addDoc, query, orderBy, Timestamp, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../context/ToastContext';
import WitnessModal from '../components/WitnessModal';
import { CONTROLLED_DRUGS } from '../data/drugDatabase';
import { logAuditAction } from '../services/auditService';
import { sendNotification } from '../services/notificationService';

// ... (Interfaces omitted for brevity)
interface StockItem { id: string; name: string; strength: string; unit: string; currentStock: number; minLevel: number; class: string; batchNumber?: string; expiryDate?: string; }
interface Transaction { id: string; timestamp: string; type: 'Receive' | 'Administer' | 'Waste' | 'Check' | 'Move'; drugName: string; amount: number; balanceAfter: number; user: string; witness?: string; notes?: string; }

const DrugsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'Stock' | 'Audit'>('Stock');
  const [stock, setStock] = useState<StockItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Transaction Modal State
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionType, setTransactionType] = useState<'Receive' | 'Waste' | 'Check' | 'Move' | 'Administer'>('Receive');
  const [selectedDrug, setSelectedDrug] = useState<StockItem | null>(null);
  const [txAmount, setTxAmount] = useState<number | ''>('');
  const [txNotes, setTxNotes] = useState('');
  const [txBatch, setTxBatch] = useState('');
  const [txExpiry, setTxExpiry] = useState('');
  
  // Witness State
  const [showWitness, setShowWitness] = useState(false);
  const [witnessData, setWitnessData] = useState<{name: string, uid: string, token: string} | null>(null);

  // Shift Count Mode State
  const [isShiftCheckMode, setIsShiftCheckMode] = useState(false);
  const [countValues, setCountValues] = useState<Record<string, number>>({});
  const [countNotes, setCountNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsubStock = onSnapshot(collection(db, 'stock'), (snap) => { setStock(snap.docs.map(d => ({ id: d.id, ...d.data() } as StockItem))); setLoading(false); });
    const q = query(collection(db, 'drug_audit'), orderBy('timestamp', 'desc'));
    const unsubTx = onSnapshot(q, (snap) => { setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data(), timestamp: d.data().timestamp.toDate().toLocaleString() } as Transaction))); });
    return () => { unsubStock(); unsubTx(); };
  }, []);

  const initiateTransaction = (type: typeof transactionType, drug?: StockItem) => { setTransactionType(type); if (drug) setSelectedDrug(drug); setTxAmount(''); setTxNotes(''); setTxBatch(''); setTxExpiry(''); setWitnessData(null); setShowTransactionModal(true); };
  
  const handleWitnessConfirmed = (name: string, uid: string, token: string) => { 
      setWitnessData({ name, uid, token }); 
      setShowWitness(false);
      
      if (isShiftCheckMode) {
          submitShiftCheck(name, token);
      } else {
          handleSubmitTransaction(name, token); 
      }
  };

  const validateAndSubmit = () => { if (!selectedDrug || !txAmount) return; const needsWitness = (transactionType === 'Waste' || transactionType === 'Check') && CONTROLLED_DRUGS.includes(selectedDrug.name); if (needsWitness && !witnessData) { setShowWitness(true); } else { handleSubmitTransaction(); } };
  
  const handleSubmitTransaction = async (witnessName?: string, witnessToken?: string) => {
      if (!selectedDrug || !user) return;
      let newBalance = selectedDrug.currentStock; const amount = Number(txAmount);
      switch(transactionType) { case 'Receive': newBalance += amount; break; case 'Administer': newBalance -= amount; break; case 'Waste': newBalance -= amount; break; case 'Move': newBalance -= amount; break; case 'Check': newBalance = amount; break; }
      const finalWitness = witnessName || witnessData?.name;
      const finalToken = witnessToken || witnessData?.token;
      
      const transactionDetails = { 
          timestamp: Timestamp.now(), 
          type: transactionType, 
          drugName: selectedDrug.name, 
          amount: amount, 
          balanceAfter: newBalance, 
          user: user.name, 
          userId: user.uid, 
          witness: finalWitness || null, 
          witnessToken: finalToken || null,
          notes: txNotes || (transactionType === 'Check' && amount !== selectedDrug.currentStock ? `Discrepancy corrected. Old: ${selectedDrug.currentStock}` : null) 
      };

      try {
          await updateDoc(doc(db, 'stock', selectedDrug.id), { currentStock: newBalance, ...(txBatch ? { batchNumber: txBatch } : {}), ...(txExpiry ? { expiryDate: txExpiry } : {}) });
          await addDoc(collection(db, 'drug_audit'), transactionDetails);
          
          await logAuditAction(
              user.uid, 
              user.name, 
              `Drug ${transactionType}`, 
              `${selectedDrug.name} x${amount} (New Bal: ${newBalance}). Witness: ${finalWitness || 'N/A'}.`, 
              'Drug'
          );

          toast.success("Transaction logged successfully.");
          setShowTransactionModal(false); setWitnessData(null);
      } catch (e) { 
          console.error("Tx Error", e); 
          toast.error("Failed to process transaction."); 
      }
  };

  const requestRestock = async (item: StockItem) => {
      if (!user) return;
      if (!confirm(`Request restocking for ${item.name}?`)) return;
      try {
          await addDoc(collection(db, 'announcements'), {
              title: `Restock Needed: ${item.name}`,
              message: `${user.name} reported low stock of ${item.name} at ${new Date().toLocaleTimeString()}. Current Level: ${item.currentStock}`,
              priority: 'Normal',
              date: Timestamp.now(),
              author: 'System',
              readBy: []
          });
          toast.success("Restock request sent to Logistics.");
      } catch (e) {
          toast.error("Failed to send request.");
      }
  };

  // --- End of Shift Count Logic ---
  
  const toggleShiftCheckMode = () => {
      if (isShiftCheckMode) {
          // Cancel
          setIsShiftCheckMode(false);
          setCountValues({});
          setCountNotes({});
      } else {
          // Start
          setIsShiftCheckMode(true);
          // Pre-fill with current? No, blind count is better practice, but for UI ease we start blank/undefined
          setCountValues({});
      }
  };

  const handleCountChange = (id: string, val: string) => {
      setCountValues(prev => ({...prev, [id]: Number(val)}));
  };

  const handleCountNoteChange = (id: string, val: string) => {
      setCountNotes(prev => ({...prev, [id]: val}));
  };

  const verifyShiftCheck = () => {
      // Validate all CDs are counted
      const cds = stock.filter(s => CONTROLLED_DRUGS.includes(s.name));
      const missing = cds.filter(s => countValues[s.id] === undefined);
      
      if (missing.length > 0) {
          toast.error(`Please count all Controlled Drugs. Missing: ${missing.length}`);
          return;
      }
      
      // Open witness modal for the whole batch
      setShowWitness(true);
  };

  const submitShiftCheck = async (witnessName: string, witnessToken: string) => {
      if (!user) return;
      const cds = stock.filter(s => CONTROLLED_DRUGS.includes(s.name));
      const batch = writeBatch(db);
      const auditPromises = [];

      let discrepancies = 0;

      for (const item of cds) {
          const counted = countValues[item.id];
          const system = item.currentStock;
          const note = countNotes[item.id] || '';
          
          if (counted !== system) {
              discrepancies++;
              // Update stock to match physical count (correction)
              const stockRef = doc(db, 'stock', item.id);
              batch.update(stockRef, { currentStock: counted });
              
              // Log specific discrepancy
              auditPromises.push(addDoc(collection(db, 'drug_audit'), {
                  timestamp: Timestamp.now(),
                  type: 'Check',
                  drugName: item.name,
                  amount: counted,
                  balanceAfter: counted,
                  user: user.name,
                  userId: user.uid,
                  witness: witnessName,
                  witnessToken: witnessToken,
                  notes: `End of Shift Check Discrepancy. System: ${system}. Note: ${note}`
              }));
          } else {
              // Log successful check
              auditPromises.push(addDoc(collection(db, 'drug_audit'), {
                  timestamp: Timestamp.now(),
                  type: 'Check',
                  drugName: item.name,
                  amount: counted,
                  balanceAfter: counted,
                  user: user.name,
                  userId: user.uid,
                  witness: witnessName,
                  witnessToken: witnessToken,
                  notes: 'End of Shift Check - Correct'
              }));
          }
      }

      try {
          await batch.commit();
          await Promise.all(auditPromises);
          
          await logAuditAction(
              user.uid,
              user.name,
              'End of Shift Count',
              `Verified ${cds.length} items with ${witnessName}. Discrepancies: ${discrepancies}`,
              'Drug'
          );

          toast.success("End of Shift Count Completed.");
          setIsShiftCheckMode(false);
          setCountValues({});
          setCountNotes({});
      } catch (e) {
          console.error(e);
          toast.error("Failed to submit shift check.");
      }
  };

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-ams-blue" /></div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Drug Register</h1>
              <p className="text-slate-500 dark:text-slate-400">Stock management and legal audit trail.</p>
          </div>
          <div className="flex gap-2">
              {!isShiftCheckMode && (
                  <>
                    <button onClick={toggleShiftCheckMode} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl font-bold shadow-md hover:bg-purple-700 transition-colors">
                        <ClipboardCheck className="w-4 h-4" /> End of Shift Count
                    </button>
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                        <button onClick={() => setActiveTab('Stock')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'Stock' ? 'bg-white dark:bg-slate-700 shadow text-ams-blue' : 'text-slate-500'}`}>Stock</button>
                        <button onClick={() => setActiveTab('Audit')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'Audit' ? 'bg-white dark:bg-slate-700 shadow text-ams-blue' : 'text-slate-500'}`}>Audit</button>
                    </div>
                  </>
              )}
          </div>
      </div>

      {isShiftCheckMode ? (
          <div className="animate-in fade-in slide-in-from-right-4">
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 p-6 rounded-2xl mb-6">
                  <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold text-purple-900 dark:text-purple-200 flex items-center gap-2">
                          <Lock className="w-6 h-6" /> Controlled Drug Check
                      </h2>
                      <button onClick={toggleShiftCheckMode} className="text-sm font-bold text-purple-700 hover:underline">Cancel Check</button>
                  </div>
                  <p className="text-sm text-purple-800 dark:text-purple-300 mb-6">
                      Enter the physical count for each item below. Discrepancies will be flagged.
                      A witness signature is required to complete this legal check.
                  </p>

                  <div className="space-y-4">
                      {stock.filter(s => CONTROLLED_DRUGS.includes(s.name)).map(item => {
                          const mismatch = countValues[item.id] !== undefined && countValues[item.id] !== item.currentStock;
                          
                          return (
                              <div key={item.id} className={`p-4 rounded-xl border-2 transition-colors ${mismatch ? 'bg-red-50 border-red-300 dark:bg-red-900/20 dark:border-red-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                                  <div className="flex flex-col md:flex-row justify-between gap-4 items-center">
                                      <div className="flex-1">
                                          <h3 className="font-bold text-slate-800 dark:text-white">{item.name}</h3>
                                          <p className="text-xs text-slate-500">{item.strength} • Batch: {item.batchNumber || 'N/A'}</p>
                                          <p className="text-xs font-mono mt-1 text-slate-400">System Count: {item.currentStock}</p>
                                      </div>
                                      
                                      <div className="flex flex-col gap-2 w-full md:w-auto">
                                          <div className="flex items-center gap-2">
                                              <span className="text-sm font-bold text-slate-500 uppercase">Actual:</span>
                                              <input 
                                                  type="number" 
                                                  className={`w-24 p-3 text-center font-bold text-lg rounded-xl border-2 outline-none focus:ring-2 ${mismatch ? 'border-red-300 bg-red-100 text-red-800 focus:ring-red-500' : 'border-slate-200 bg-slate-50 dark:bg-slate-900 dark:border-slate-600 dark:text-white focus:ring-purple-500'}`}
                                                  placeholder="0"
                                                  value={countValues[item.id] ?? ''}
                                                  onChange={e => handleCountChange(item.id, e.target.value)}
                                              />
                                          </div>
                                          {mismatch && (
                                              <input 
                                                  className="w-full text-xs p-2 rounded border border-red-200 bg-white text-red-700 placeholder-red-300"
                                                  placeholder="Reason for discrepancy..."
                                                  value={countNotes[item.id] || ''}
                                                  onChange={e => handleCountNoteChange(item.id, e.target.value)}
                                              />
                                          )}
                                      </div>
                                  </div>
                              </div>
                          );
                      })}
                  </div>

                  <div className="mt-8 flex justify-end">
                      <button 
                          onClick={verifyShiftCheck}
                          className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl shadow-xl flex items-center gap-2 transition-transform active:scale-95"
                      >
                          <CheckCircle className="w-6 h-6" /> Verify & Sign Check
                      </button>
                  </div>
              </div>
          </div>
      ) : (
          <>
            {activeTab === 'Stock' && (
                <div className="grid grid-cols-1 gap-4 animate-in fade-in">
                    {/* Desktop Table View */}
                    <div className="hidden md:block bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
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
                                                    {item.currentStock <= item.minLevel && (
                                                        <button onClick={() => requestRestock(item)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100" title="Request Restock"><BellRing className="w-4 h-4" /></button>
                                                    )}
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

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-4">
                        {stock.map(item => (
                            <div key={item.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                            {item.name}
                                            {CONTROLLED_DRUGS.includes(item.name) && <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] rounded border border-red-200">CD</span>}
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{item.strength}</p>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className={`px-3 py-1 rounded-full font-bold font-mono text-sm ${item.currentStock <= item.minLevel ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                            Qty: {item.currentStock}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                    <div>
                                        {item.currentStock <= item.minLevel ? 
                                            <span className="text-red-600 font-bold text-xs flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Low Stock</span> : 
                                            <span className="text-green-600 font-bold text-xs flex items-center gap-1"><CheckCircle className="w-3 h-3" /> OK</span>
                                        }
                                    </div>
                                    <div className="flex gap-2">
                                        {item.currentStock <= item.minLevel && (
                                            <button onClick={() => requestRestock(item)} className="p-2 bg-red-50 text-red-600 rounded-lg"><BellRing className="w-4 h-4" /></button>
                                        )}
                                        <button onClick={() => initiateTransaction('Administer', item)} className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg"><Syringe className="w-4 h-4" /></button>
                                        <button onClick={() => initiateTransaction('Receive', item)} className="p-2 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg"><Plus className="w-4 h-4" /></button>
                                        <button onClick={() => initiateTransaction('Check', item)} className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-lg"><RefreshCcw className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            </div>
                        ))}
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
          </>
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
      {showWitness && (selectedDrug || isShiftCheckMode) && (
          <WitnessModal 
            drugName={isShiftCheckMode ? "Complete CD Check" : selectedDrug?.name || 'Drug'} 
            onWitnessConfirmed={handleWitnessConfirmed} 
            onCancel={() => setShowWitness(false)} 
          />
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