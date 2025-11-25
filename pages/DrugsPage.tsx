
import React, { useState, useEffect } from 'react';
import { Pill, Plus, AlertTriangle, Lock, RefreshCcw, History, Loader2, ArrowRightLeft, Trash2, CheckCircle, FileText, Syringe, Search, Filter } from 'lucide-react';
import { db } from '../services/firebase';
import { collection, onSnapshot, addDoc, query, orderBy, Timestamp, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import WitnessModal from '../components/WitnessModal';
import { CONTROLLED_DRUGS } from '../data/drugDatabase';

interface StockItem {
  id: string;
  name: string;
  strength: string;
  unit: string;
  currentStock: number;
  minLevel: number;
  class: string;
  batchNumber?: string;
  expiryDate?: string;
}

interface Transaction {
  id: string;
  timestamp: string;
  type: 'Receive' | 'Administer' | 'Waste' | 'Check' | 'Move';
  drugName: string;
  amount: number;
  balanceAfter: number;
  user: string;
  witness?: string;
  notes?: string;
}

const DrugsPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'Stock' | 'Audit'>('Stock');
  const [stock, setStock] = useState<StockItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionType, setTransactionType] = useState<'Receive' | 'Waste' | 'Check' | 'Move' | 'Administer'>('Receive');
  const [selectedDrug, setSelectedDrug] = useState<StockItem | null>(null);
  
  // Transaction Form Data
  const [txAmount, setTxAmount] = useState<number | ''>('');
  const [txNotes, setTxNotes] = useState('');
  const [txBatch, setTxBatch] = useState('');
  const [txExpiry, setTxExpiry] = useState('');
  
  // Witness State
  const [showWitness, setShowWitness] = useState(false);
  const [witnessData, setWitnessData] = useState<{name: string, uid: string} | null>(null);

  useEffect(() => {
    // 1. Subscribe to Stock
    const unsubStock = onSnapshot(collection(db, 'stock'), (snap) => {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as StockItem));
        setStock(items);
        setLoading(false);
    });

    // 2. Subscribe to Transactions
    const q = query(collection(db, 'drug_audit'), orderBy('timestamp', 'desc'));
    const unsubTx = onSnapshot(q, (snap) => {
        const txs = snap.docs.map(d => ({ 
            id: d.id, 
            ...d.data(),
            timestamp: d.data().timestamp.toDate().toLocaleString() 
        } as Transaction));
        setTransactions(txs);
    });

    return () => {
        unsubStock();
        unsubTx();
    };
  }, []);

  const initiateTransaction = (type: typeof transactionType, drug?: StockItem) => {
      setTransactionType(type);
      if (drug) setSelectedDrug(drug);
      setTxAmount('');
      setTxNotes('');
      setTxBatch('');
      setTxExpiry('');
      setWitnessData(null);
      setShowTransactionModal(true);
  };

  const handleWitnessConfirmed = (name: string, uid: string) => {
      setWitnessData({ name, uid });
      setShowWitness(false);
      // Auto-submit after witness if valid
      handleSubmitTransaction(name);
  };

  const validateAndSubmit = () => {
      if (!selectedDrug || !txAmount) return;
      
      const needsWitness = (transactionType === 'Waste' || transactionType === 'Check') && CONTROLLED_DRUGS.includes(selectedDrug.name);
      
      if (needsWitness && !witnessData) {
          setShowWitness(true);
      } else {
          handleSubmitTransaction();
      }
  };

  const handleSubmitTransaction = async (witnessName?: string) => {
      if (!selectedDrug || !user) return;
      
      let newBalance = selectedDrug.currentStock;
      const amount = Number(txAmount);
      
      switch(transactionType) {
          case 'Receive': newBalance += amount; break;
          case 'Administer': newBalance -= amount; break;
          case 'Waste': newBalance -= amount; break;
          case 'Move': newBalance -= amount; break; 
          case 'Check': 
              newBalance = amount; 
              break;
      }

      const finalWitness = witnessName || witnessData?.name;

      try {
          // 1. Update Stock
          await updateDoc(doc(db, 'stock', selectedDrug.id), {
              currentStock: newBalance,
              ...(txBatch ? { batchNumber: txBatch } : {}),
              ...(txExpiry ? { expiryDate: txExpiry } : {})
          });

          // 2. Add Audit Log
          await addDoc(collection(db, 'drug_audit'), {
              timestamp: Timestamp.now(),
              type: transactionType,
              drugName: selectedDrug.name,
              amount: amount,
              balanceAfter: newBalance,
              user: user.name,
              userId: user.uid,
              witness: finalWitness || null,
              notes: txNotes || (transactionType === 'Check' && amount !== selectedDrug.currentStock ? `Discrepancy corrected. Old: ${selectedDrug.currentStock}` : null)
          });

          alert("Transaction logged successfully.");
          setShowTransactionModal(false);
          setWitnessData(null);
      } catch (e) {
          console.error("Tx Error", e);
          alert("Failed to process transaction.");
      }
  };

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-ams-blue" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                <Lock className="w-6 h-6 text-red-600" /> Controlled Drugs Register
            </h1>
            <p className="text-slate-500 font-medium mt-1">Legal digital ledger for Schedule 2 & 3 medications.</p>
        </div>
        <div className="flex gap-3">
            <button 
                onClick={() => initiateTransaction('Check')}
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-700 rounded-xl font-bold hover:bg-slate-50 border border-slate-200 shadow-sm transition-all"
            >
                <RefreshCcw className="w-4 h-4" /> Stock Check
            </button>
            <button 
                onClick={() => initiateTransaction('Receive')}
                className="flex items-center gap-2 px-5 py-2.5 bg-ams-blue text-white rounded-xl font-bold hover:bg-blue-900 shadow-lg hover:shadow-blue-900/20 transition-all hover:scale-105"
            >
                <Plus className="w-4 h-4" /> Receive Stock
            </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1.5 rounded-xl w-fit">
          <button 
            onClick={() => setActiveTab('Stock')}
            className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'Stock' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
              Current Stock
          </button>
          <button 
            onClick={() => setActiveTab('Audit')}
            className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'Audit' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
              Audit Ledger
          </button>
      </div>

      {/* Stock Cards */}
      {activeTab === 'Stock' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in">
            {stock.length === 0 && <div className="col-span-full text-center py-12 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">No stock configured in database.</div>}
            
            {stock.map(item => {
                const isCD = CONTROLLED_DRUGS.includes(item.name);
                return (
                    <div key={item.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden relative group transition-all hover:shadow-md ${isCD ? 'border-red-100' : 'border-slate-200'}`}>
                        {isCD && (
                            <div className="absolute top-0 right-0 bg-red-50 text-red-600 text-[10px] font-bold px-3 py-1.5 rounded-bl-xl border-b border-l border-red-100 flex items-center gap-1 z-10">
                                <Lock className="w-3 h-3" /> CONTROLLED
                            </div>
                        )}
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-6">
                                <div className={`p-4 rounded-2xl ${isCD ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-ams-blue'}`}>
                                    <Pill className="w-8 h-8" />
                                </div>
                                <div className="text-right">
                                    <p className={`text-4xl font-bold tracking-tight ${item.currentStock < item.minLevel ? 'text-amber-600' : 'text-slate-800'}`}>
                                        {item.currentStock}
                                    </p>
                                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mt-1">{item.unit}</p>
                                </div>
                            </div>
                            <div className="mb-6">
                                <h3 className="font-bold text-slate-800 text-xl leading-tight mb-1">{item.name}</h3>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{item.strength}</span>
                                    <span className="text-xs font-bold text-slate-400 uppercase">Class {item.class}</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <button onClick={() => initiateTransaction('Administer', item)} className="action-btn text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-100">
                                    <Syringe className="w-5 h-5 mb-1" /> Admin
                                </button>
                                <button onClick={() => initiateTransaction('Waste', item)} className="action-btn text-amber-600 bg-amber-50 hover:bg-amber-100 border-amber-100">
                                    <Trash2 className="w-5 h-5 mb-1" /> Waste
                                </button>
                                <button onClick={() => initiateTransaction('Check', item)} className="action-btn text-slate-600 bg-slate-50 hover:bg-slate-100 border-slate-200">
                                    <RefreshCcw className="w-5 h-5 mb-1" /> Check
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
      )}

      {/* Audit Log */}
      {activeTab === 'Audit' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs border-b border-slate-200">
                      <tr>
                          <th className="p-5">Time</th>
                          <th className="p-5">Transaction</th>
                          <th className="p-5">Drug</th>
                          <th className="p-5">Change</th>
                          <th className="p-5">Balance</th>
                          <th className="p-5">User</th>
                          <th className="p-5">Notes / Witness</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {transactions.map(tx => (
                          <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-5 font-mono text-xs text-slate-500 font-medium">{tx.timestamp}</td>
                              <td className="p-5">
                                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex w-fit items-center gap-1.5 border ${
                                      tx.type === 'Receive' ? 'bg-green-50 text-green-700 border-green-200' :
                                      tx.type === 'Administer' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                      tx.type === 'Waste' ? 'bg-red-50 text-red-700 border-red-200' :
                                      tx.type === 'Check' ? 'bg-slate-100 text-slate-700 border-slate-200' :
                                      'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}>
                                      {tx.type === 'Receive' && <Plus className="w-3 h-3" />}
                                      {tx.type === 'Administer' && <Syringe className="w-3 h-3" />}
                                      {tx.type === 'Waste' && <Trash2 className="w-3 h-3" />}
                                      {tx.type === 'Check' && <CheckCircle className="w-3 h-3" />}
                                      {tx.type === 'Move' && <ArrowRightLeft className="w-3 h-3" />}
                                      {tx.type.toUpperCase()}
                                  </span>
                              </td>
                              <td className="p-5 font-bold text-slate-700">{tx.drugName}</td>
                              <td className="p-5">
                                  {tx.type === 'Check' ? (
                                      <span className="text-slate-400 italic font-medium">Verified</span>
                                  ) : (
                                      <span className={`font-bold font-mono text-base ${['Receive'].includes(tx.type) ? 'text-green-600' : 'text-red-600'}`}>
                                          {['Receive'].includes(tx.type) ? '+' : '-'}{tx.amount}
                                      </span>
                                  )}
                              </td>
                              <td className="p-5 font-bold text-slate-800 font-mono text-base">{tx.balanceAfter}</td>
                              <td className="p-5 text-slate-600 font-medium">{tx.user}</td>
                              <td className="p-5 text-slate-500 text-xs">
                                  {tx.witness && (
                                      <div className="flex items-center gap-1.5 text-purple-700 font-bold mb-1 bg-purple-50 px-2 py-0.5 rounded w-fit border border-purple-100">
                                          <Lock className="w-3 h-3" /> Wit: {tx.witness}
                                      </div>
                                  )}
                                  {tx.notes && <span className="italic block mt-1 text-slate-400">"{tx.notes}"</span>}
                              </td>
                          </tr>
                      ))}
                      {transactions.length === 0 && (
                          <tr><td colSpan={7} className="p-12 text-center text-slate-400 italic">No ledger entries found.</td></tr>
                      )}
                  </tbody>
              </table>
            </div>
        </div>
      )}

      {/* Transaction Modal */}
      {showTransactionModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in zoom-in duration-200">
              <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md border border-white/20">
                  <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                      {transactionType === 'Receive' && <div className="p-2 bg-green-100 rounded-lg text-green-600"><Plus className="w-5 h-5" /></div>}
                      {transactionType === 'Waste' && <div className="p-2 bg-red-100 rounded-lg text-red-600"><Trash2 className="w-5 h-5" /></div>}
                      {transactionType === 'Check' && <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><RefreshCcw className="w-5 h-5" /></div>}
                      {transactionType === 'Administer' && <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><Syringe className="w-5 h-5" /></div>}
                      {transactionType} Stock
                  </h3>
                  
                  <div className="space-y-5">
                      {/* Drug Selection (if not pre-selected) */}
                      {!selectedDrug ? (
                          <div>
                              <label className="input-label">Select Drug</label>
                              <select 
                                className="input-field h-12"
                                onChange={e => setSelectedDrug(stock.find(s => s.id === e.target.value) || null)}
                              >
                                  <option value="">-- Select --</option>
                                  {stock.map(s => <option key={s.id} value={s.id}>{s.name} ({s.currentStock})</option>)}
                              </select>
                          </div>
                      ) : (
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                              <div>
                                  <span className="font-bold text-slate-800 block text-lg">{selectedDrug.name}</span>
                                  <span className="text-xs text-slate-500 font-bold uppercase">{selectedDrug.strength}</span>
                              </div>
                              <span className="text-sm bg-white px-3 py-1.5 rounded-lg border border-slate-200 font-mono font-bold">
                                  Qty: {selectedDrug.currentStock}
                              </span>
                          </div>
                      )}

                      {/* Dynamic Fields based on Type */}
                      <div>
                          <label className="input-label">
                              {transactionType === 'Check' ? 'Counted Total' : 'Amount'} ({selectedDrug?.unit || 'Units'})
                          </label>
                          <input 
                              type="number" 
                              className="input-field text-2xl font-bold text-center h-16"
                              value={txAmount}
                              onChange={e => setTxAmount(Number(e.target.value))}
                              placeholder="0"
                              autoFocus
                          />
                      </div>

                      {transactionType === 'Receive' && (
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="input-label">Batch No.</label>
                                  <input className="input-field font-mono" value={txBatch} onChange={e => setTxBatch(e.target.value)} />
                              </div>
                              <div>
                                  <label className="input-label">Expiry</label>
                                  <input type="date" className="input-field" value={txExpiry} onChange={e => setTxExpiry(e.target.value)} />
                              </div>
                          </div>
                      )}

                      <div>
                          <label className="input-label">Notes / Reason</label>
                          <textarea 
                              className="input-field" 
                              rows={2} 
                              value={txNotes} 
                              onChange={e => setTxNotes(e.target.value)} 
                              placeholder={transactionType === 'Waste' ? 'Reason for wastage...' : 'Optional notes...'}
                          />
                      </div>

                      <div className="flex gap-3 pt-4">
                          <button onClick={() => setShowTransactionModal(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors">Cancel</button>
                          <button 
                              onClick={validateAndSubmit}
                              disabled={!selectedDrug || !txAmount}
                              className="flex-1 py-3 bg-ams-blue text-white font-bold rounded-xl hover:bg-blue-900 shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                              {transactionType === 'Check' ? 'Confirm Count' : 'Submit'}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Witness Modal */}
      {showWitness && selectedDrug && (
          <WitnessModal 
              drugName={selectedDrug.name} 
              onWitnessConfirmed={handleWitnessConfirmed}
              onCancel={() => setShowWitness(false)}
          />
      )}

      <style>{`
        .input-label { @apply block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1; }
        .input-field { @apply w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ams-blue focus:border-transparent transition-all; }
        .action-btn { @apply flex flex-col items-center justify-center p-3 rounded-xl text-xs font-bold border transition-all hover:scale-105 active:scale-95 shadow-sm; }
      `}</style>
    </div>
  );
};

export default DrugsPage;
