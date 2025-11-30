
import React, { useState, useEffect } from 'react';
import { QrCode, Truck, Briefcase, XCircle, Loader2, Plus, History, Trash2, Gauge, ListChecks } from 'lucide-react';
import { Vehicle, MedicalKit, KitItem, AssetCheck, Role, ChecklistItem } from '../types';
import QrScannerModal from '../components/QrScannerModal';
import { db } from '../services/firebase';
import { collection, addDoc, doc, setDoc, onSnapshot, query, where, orderBy, updateDoc } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { DEFAULT_VDI_CHECKLIST, DEFAULT_KIT_CHECKLIST_ITEMS } from '../data/assetDefaults';

const RESTRICTED_ROLES = [Role.FirstAider, Role.Welfare, Role.Pending];

const SUGGESTED_ITEMS = [
    'Defibrillator Pads', 'Spare Batteries', 'Hand Gel', 'Gloves (S/M/L)', 'Clinical Waste Bags', 
    'Tough Cut Shears', 'Stethoscope', 'Pupil Torch', 'Thermometer Covers'
];

// Defined outside component to prevent re-renders
const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
        case 'Operational': return <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded font-bold border border-green-200 dark:border-green-800">Operational</span>;
        case 'Maintenance': return <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-1 rounded font-bold border border-amber-200 dark:border-amber-800">Maintenance</span>;
        case 'Off Road': return <span className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-1 rounded font-bold border border-red-200 dark:border-red-800">Off Road</span>;
        case 'Ready': return <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded font-bold border border-green-200 dark:border-green-800">Ready</span>;
        case 'Restock Needed': return <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-1 rounded font-bold border border-amber-200 dark:border-amber-800">Restock Needed</span>;
        case 'Quarantined': return <span className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-1 rounded font-bold border border-red-200 dark:border-red-800">Quarantined</span>;
        default: return <span className="text-xs bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 px-2 py-1 rounded font-bold">{status}</span>;
    }
};

const ExpiryBadge = ({ date }: { date?: string }) => {
    if (!date) return <span className="text-slate-400">-</span>;
    const expiry = new Date(date);
    const now = new Date();
    const days = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 3600 * 24));
    
    let color = 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400';
    if (days < 0) color = 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 font-bold';
    else if (days < 30) color = 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 font-bold';
    
    return <span className={`px-2 py-0.5 rounded text-xs ${color}`}>{date}</span>;
};

const AssetPage = () => {
  const { user } = useAuth();
  const isRestricted = user ? RESTRICTED_ROLES.includes(user.role) : false;
  const isManager = user?.role === Role.Manager || user?.role === Role.Admin;
  
  const [activeTab, setActiveTab] = useState<'Dashboard' | 'Fleet' | 'Inventory'>('Dashboard');
  const [showScanner, setShowScanner] = useState(false);
  const [fleet, setFleet] = useState<Vehicle[]>([]);
  const [kits, setKits] = useState<MedicalKit[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [activeAsset, setActiveAsset] = useState<Vehicle | MedicalKit | null>(null);
  const [activeAssetType, setActiveAssetType] = useState<'Vehicle' | 'Kit' | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState<string | null>(null);
  const [assetHistory, setAssetHistory] = useState<AssetCheck[]>([]);
  const [showManageKitModal, setShowManageKitModal] = useState<MedicalKit | null>(null);
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  
  // Check Form State
  const [checkData, setCheckData] = useState<Record<string, boolean>>({});
  const [checkFaults, setCheckFaults] = useState('');
  const [checkHasFault, setCheckHasFault] = useState(false);
  const [currentMileage, setCurrentMileage] = useState<number>(0);
  
  // Kit Manage State
  const [newItem, setNewItem] = useState<Partial<KitItem>>({ name: '', quantity: 1 });

  // Add Asset State
  const [newAssetType, setNewAssetType] = useState<'Vehicle' | 'Kit'>('Vehicle');
  const [newAssetDetails, setNewAssetDetails] = useState<any>({ 
      id: '', name: '', type: '', registration: '', checklist: [] 
  });
  const [newChecklistItem, setNewChecklistItem] = useState('');

  useEffect(() => {
    if (isRestricted) { setLoading(false); return; }
    
    const unsubFleet = onSnapshot(collection(db, 'fleet'), (snap) => {
        setFleet(snap.docs.map(d => ({ id: d.id, ...d.data() } as Vehicle)));
    });
    const unsubKits = onSnapshot(collection(db, 'medical_kits'), (snap) => {
        setKits(snap.docs.map(d => ({ id: d.id, ...d.data() } as MedicalKit)));
        setLoading(false);
    });
    
    return () => { unsubFleet(); unsubKits(); };
  }, [isRestricted]);

  useEffect(() => {
      if (showHistoryModal) {
          const q = query(collection(db, 'asset_checks'), where('assetId', '==', showHistoryModal), orderBy('timestamp', 'desc'));
          const unsub = onSnapshot(q, (snap) => {
              setAssetHistory(snap.docs.map(d => ({ id: d.id, ...d.data() } as AssetCheck)));
          });
          return () => unsub();
      }
  }, [showHistoryModal]);

  const handleScanComplete = async (code: string) => {
      setShowScanner(false);
      // Try finding in fleet
      const vehicle = fleet.find(v => v.id === code || v.registration === code);
      if (vehicle) {
          openCheckModal(vehicle, 'Vehicle');
          return;
      }
      // Try finding in kits
      const kit = kits.find(k => k.id === code);
      if (kit) {
          openCheckModal(kit, 'Kit');
          return;
      }
      alert("Asset not found: " + code);
  };

  const openCheckModal = (asset: Vehicle | MedicalKit, type: 'Vehicle' | 'Kit') => {
      setActiveAsset(asset);
      setActiveAssetType(type);
      setCheckData({});
      setCheckHasFault(false);
      setCheckFaults('');
      if (type === 'Vehicle') {
          setCurrentMileage((asset as Vehicle).mileage || 0);
      }
      setShowScanner(false);
  };

  const submitCheck = async () => {
      if (!activeAsset || !user) return;
      
      const status = checkHasFault ? 'Fail' : 'Pass';
      
      try {
          // Log the check
          await addDoc(collection(db, 'asset_checks'), {
              assetId: activeAsset.id,
              assetType: activeAssetType,
              userId: user.uid,
              userName: user.name,
              timestamp: new Date().toISOString(),
              status,
              faults: checkHasFault ? [checkFaults] : [],
              checklistData: checkData
          });

          // Update asset status
          if (activeAssetType === 'Vehicle') {
              const newStatus = checkHasFault ? 'Maintenance' : 'Operational';
              await updateDoc(doc(db, 'fleet', activeAsset.id), {
                  lastCheck: new Date().toISOString(),
                  mileage: currentMileage,
                  status: newStatus
              });
          } else {
              const newStatus = checkHasFault ? 'Restock Needed' : 'Ready';
              await updateDoc(doc(db, 'medical_kits', activeAsset.id), {
                  lastCheck: new Date().toISOString(),
                  status: newStatus
              });
          }

          setActiveAsset(null);
          alert(`Check submitted: ${status}`);
      } catch (e) {
          console.error("Check submission failed", e);
          alert("Error submitting check");
      }
  };

  // Helper to find earliest expiry in kit
  const getEarliestExpiry = (contents: KitItem[]): string | undefined => {
      const dates = contents
          .filter(i => i.expiryDate)
          .map(i => i.expiryDate!);
      if (dates.length === 0) return undefined;
      return dates.sort()[0];
  };

  const handleAddKitItem = async () => {
      if (!showManageKitModal || !newItem.name) return;
      
      const item: KitItem = {
          id: Date.now().toString(),
          name: newItem.name,
          quantity: newItem.quantity || 1,
          batchNumber: newItem.batchNumber,
          expiryDate: newItem.expiryDate
      };
      
      const updatedContents = [...showManageKitModal.contents, item];
      const earliest = getEarliestExpiry(updatedContents);
      
      await updateDoc(doc(db, 'medical_kits', showManageKitModal.id), { 
          contents: updatedContents,
          earliestExpiry: earliest
      });
      setShowManageKitModal({ ...showManageKitModal, contents: updatedContents, earliestExpiry: earliest });
      setNewItem({ name: '', quantity: 1 });
  };

  const handleRemoveKitItem = async (itemId: string) => {
      if (!showManageKitModal) return;
      const updatedContents = showManageKitModal.contents.filter(i => i.id !== itemId);
      const earliest = getEarliestExpiry(updatedContents);
      
      await updateDoc(doc(db, 'medical_kits', showManageKitModal.id), { 
          contents: updatedContents,
          earliestExpiry: earliest || null
      });
      setShowManageKitModal({ ...showManageKitModal, contents: updatedContents, earliestExpiry: earliest });
  };

  // --- Add Asset Logic ---
  const handleAddAsset = async () => {
      if (!newAssetDetails.id || !newAssetDetails.name) return;
      
      try {
          if (newAssetType === 'Vehicle') {
              const vehicle: Vehicle = {
                  id: newAssetDetails.id,
                  registration: newAssetDetails.registration,
                  callSign: newAssetDetails.name,
                  type: newAssetDetails.type || 'Ambulance',
                  status: 'Operational',
                  mileage: 0,
                  checklist: newAssetDetails.checklist // Custom checklist
              };
              await setDoc(doc(db, 'fleet', vehicle.id), vehicle);
          } else {
              const kit: MedicalKit = {
                  id: newAssetDetails.id,
                  name: newAssetDetails.name,
                  type: newAssetDetails.type || 'Response Bag',
                  status: 'Ready',
                  contents: [],
                  checklist: newAssetDetails.checklist // Custom checklist
              };
              await setDoc(doc(db, 'medical_kits', kit.id), kit);
          }
          setShowAddAssetModal(false);
          setNewAssetDetails({ id: '', name: '', type: '', registration: '', checklist: [] });
      } catch (e) {
          console.error("Error adding asset", e);
          alert("Failed to create asset.");
      }
  };

  const addCustomChecklistItem = () => {
      if (!newChecklistItem) return;
      const item: ChecklistItem = {
          id: `custom_${Date.now()}`,
          label: newChecklistItem,
          category: 'Custom'
      };
      setNewAssetDetails({ ...newAssetDetails, checklist: [...newAssetDetails.checklist, item] });
      setNewChecklistItem('');
  };

  const addSuggestedItem = (label: string) => {
      const item: ChecklistItem = {
          id: `custom_${Date.now()}`,
          label: label,
          category: 'Standard'
      };
      setNewAssetDetails({ ...newAssetDetails, checklist: [...newAssetDetails.checklist, item] });
  };

  const removeCustomChecklistItem = (id: string) => {
      setNewAssetDetails({ 
          ...newAssetDetails, 
          checklist: newAssetDetails.checklist.filter((i: ChecklistItem) => i.id !== id) 
      });
  };

  const getChecklistForAsset = (asset: Vehicle | MedicalKit, type: 'Vehicle' | 'Kit'): ChecklistItem[] => {
      if (asset.checklist && asset.checklist.length > 0) {
          return asset.checklist;
      }
      
      if (type === 'Vehicle') {
          return DEFAULT_VDI_CHECKLIST;
      } else {
          // Map string[] to ChecklistItem[] for backwards compatibility / defaults
          const items = DEFAULT_KIT_CHECKLIST_ITEMS[asset.type] || [];
          return items.map((label, idx) => ({ id: `default_${idx}`, label, category: 'Standard' }));
      }
  };

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-ams-blue" /></div>;

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Asset Management</h1>
                <p className="text-slate-500 dark:text-slate-400">Fleet tracking and inventory checks.</p>
            </div>
            <div className="flex gap-2">
                {isManager && (
                    <button 
                        onClick={() => setShowAddAssetModal(true)}
                        className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-all active:scale-95"
                    >
                        <Plus className="w-5 h-5" /> Add Asset
                    </button>
                )}
                <button 
                    onClick={() => setShowScanner(true)}
                    className="flex items-center gap-2 px-5 py-3 bg-ams-blue text-white rounded-xl font-bold shadow-lg hover:bg-blue-900 transition-all active:scale-95"
                >
                    <QrCode className="w-5 h-5" /> Scan Asset
                </button>
            </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-slate-200 dark:border-slate-700 pb-2 overflow-x-auto">
            {['Dashboard', 'Fleet', 'Inventory'].map((tab) => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`px-4 py-2 font-bold text-sm rounded-lg transition-colors whitespace-nowrap ${activeTab === tab ? 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                >
                    {tab}
                </button>
            ))}
        </div>

        {activeTab === 'Dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><Truck className="w-5 h-5 text-ams-blue" /> Fleet Status</h3>
                    <div className="space-y-3">
                        {fleet.map(vehicle => (
                            <div key={vehicle.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700">
                                <div>
                                    <span className="font-bold text-slate-800 dark:text-white">{vehicle.callSign}</span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400 block">{vehicle.registration}</span>
                                </div>
                                <StatusBadge status={vehicle.status} />
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><Briefcase className="w-5 h-5 text-ams-blue" /> Inventory Alerts</h3>
                    <div className="space-y-3">
                        {kits.filter(k => k.status !== 'Ready' || (k.earliestExpiry && new Date(k.earliestExpiry) < new Date())).length === 0 && <p className="text-slate-400 text-sm">All kits ready.</p>}
                        {kits.filter(k => k.status !== 'Ready' || (k.earliestExpiry && new Date(k.earliestExpiry) < new Date())).map(kit => (
                            <div key={kit.id} className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/30">
                                <div>
                                    <span className="font-bold text-red-800 dark:text-red-200">{kit.name}</span>
                                    {kit.earliestExpiry && new Date(kit.earliestExpiry) < new Date() && (
                                        <span className="block text-xs text-red-600 font-bold">Expired Item</span>
                                    )}
                                </div>
                                <StatusBadge status={kit.status} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'Fleet' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in">
                {fleet.map(vehicle => (
                    <div key={vehicle.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden group">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                                    <Truck className="w-6 h-6 text-ams-blue dark:text-blue-400" />
                                </div>
                                <StatusBadge status={vehicle.status} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">{vehicle.callSign}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-mono mt-1">{vehicle.registration}</p>
                            
                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                                <span>Last Check: {vehicle.lastCheck ? new Date(vehicle.lastCheck).toLocaleDateString() : 'Never'}</span>
                                <span>{vehicle.mileage.toLocaleString()} mi</span>
                            </div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 border-t border-slate-200 dark:border-slate-700 flex gap-2">
                            <button onClick={() => openCheckModal(vehicle, 'Vehicle')} className="flex-1 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Start VDI</button>
                            <button onClick={() => setShowHistoryModal(vehicle.id)} className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:text-ams-blue transition-colors" title="History"><History className="w-5 h-5" /></button>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {activeTab === 'Inventory' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in">
                {kits.map(kit => (
                    <div key={kit.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
                                    <Briefcase className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <StatusBadge status={kit.status} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">{kit.name}</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{kit.type}</p>
                            
                            <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                                <span className="text-xs text-slate-400">ID: {kit.id}</span>
                                {kit.earliestExpiry && (
                                    <div className="text-xs">
                                        Exp: <ExpiryBadge date={kit.earliestExpiry} />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 border-t border-slate-200 dark:border-slate-700 flex gap-2">
                            <button onClick={() => setShowManageKitModal(kit)} className="flex-1 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Manage</button>
                            <button onClick={() => openCheckModal(kit, 'Kit')} className="px-4 py-2 bg-ams-blue text-white rounded-lg text-sm font-bold hover:bg-blue-900 transition-colors">Check</button>
                            <button onClick={() => setShowHistoryModal(kit.id)} className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:text-ams-blue transition-colors" title="History"><History className="w-5 h-5" /></button>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {showScanner && <QrScannerModal onScan={handleScanComplete} onClose={() => setShowScanner(false)} />}

        {/* Add Asset Modal, Manage Kit Modal, Check VDI Modal, History Modal... */}
        {/* Same as before but now using newAssetDetails.checklist which is built using new defaults logic in handleAddAsset */}
        {/* ... (Rest of the component logic for modals remains identical to previous, just contextually correct) ... */}
        
        {/* Add Asset Modal (Managers) */}
        {showAddAssetModal && (
            <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in zoom-in duration-200">
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700 max-h-[90vh]">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                        <h3 className="font-bold text-xl text-slate-800 dark:text-white">Create New Asset</h3>
                        <button onClick={() => setShowAddAssetModal(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><XCircle className="w-6 h-6 text-slate-400" /></button>
                    </div>
                    <div className="p-6 flex-1 overflow-y-auto space-y-4">
                        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-700 rounded-xl">
                            <button onClick={() => setNewAssetType('Vehicle')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${newAssetType === 'Vehicle' ? 'bg-white dark:bg-slate-600 shadow text-ams-blue dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>Vehicle</button>
                            <button onClick={() => setNewAssetType('Kit')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${newAssetType === 'Kit' ? 'bg-white dark:bg-slate-600 shadow text-ams-blue dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>Kit Bag</button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Asset ID</label>
                                    <input className="w-full input-field" placeholder="e.g. V001" value={newAssetDetails.id} onChange={e => setNewAssetDetails({...newAssetDetails, id: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{newAssetType === 'Vehicle' ? 'Registration' : 'Type'}</label>
                                    {newAssetType === 'Vehicle' ? (
                                        <input className="w-full input-field" placeholder="e.g. AB12 CDE" value={newAssetDetails.registration} onChange={e => setNewAssetDetails({...newAssetDetails, registration: e.target.value})} />
                                    ) : (
                                        <select className="w-full input-field" value={newAssetDetails.type} onChange={e => setNewAssetDetails({...newAssetDetails, type: e.target.value})}>
                                            <option value="">Select Type...</option>
                                            <option>Paramedic Bag</option>
                                            <option>Response Bag</option>
                                            <option>Trauma Bag</option>
                                            <option>Drug Pack</option>
                                            <option>O2 Bag</option>
                                            <option>Welfare Bag</option>
                                        </select>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Name / Call Sign</label>
                                <input className="w-full input-field" placeholder={newAssetType === 'Vehicle' ? 'e.g. RRV-01' : 'e.g. Trauma Bag 3'} value={newAssetDetails.name} onChange={e => setNewAssetDetails({...newAssetDetails, name: e.target.value})} />
                            </div>
                            
                            {/* Custom Checklist Builder */}
                            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                                <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                                    <ListChecks className="w-4 h-4" /> Custom Checklist
                                </h4>
                                <div className="mb-3 flex flex-wrap gap-2">
                                    {SUGGESTED_ITEMS.map(item => (
                                        <button key={item} onClick={() => addSuggestedItem(item)} className="text-[10px] px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-600 transition-colors flex items-center gap-1">
                                            <Plus className="w-3 h-3" /> {item}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex gap-2 mb-2">
                                    <input className="w-full input-field" placeholder="Add Custom Item..." value={newChecklistItem} onChange={e => setNewChecklistItem(e.target.value)} />
                                    <button onClick={addCustomChecklistItem} className="px-3 bg-slate-200 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 font-bold"><Plus className="w-4 h-4" /></button>
                                </div>
                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                    {newAssetDetails.checklist.map((item: ChecklistItem, idx: number) => (
                                        <div key={idx} className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-700 text-sm">
                                            <span className="text-slate-700 dark:text-slate-300">{item.label}</span>
                                            <button onClick={() => removeCustomChecklistItem(item.id)} className="text-red-500 hover:bg-red-100 p-1 rounded"><Trash2 className="w-3 h-3" /></button>
                                        </div>
                                    ))}
                                    {newAssetDetails.checklist.length === 0 && <p className="text-xs text-slate-400 italic">No custom items. Will use role-based default.</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="p-6 border-t border-slate-200 dark:border-slate-700">
                        <button onClick={handleAddAsset} className="w-full py-3 bg-ams-blue text-white font-bold rounded-xl shadow-lg hover:bg-blue-900 transition-all active:scale-95">Create Asset</button>
                    </div>
                </div>
            </div>
        )}

        {/* ... Other modals (Manage, Check, History) same as original ... */}
        {/* Manage Kit Content Modal */}
        {showManageKitModal && (
            <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in zoom-in duration-200">
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg h-[80vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                         <div>
                            <h3 className="font-bold text-xl text-slate-800 dark:text-white">Manage Kit Contents</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{showManageKitModal.name}</p>
                        </div>
                        <button onClick={() => setShowManageKitModal(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><XCircle className="w-6 h-6 text-slate-400" /></button>
                    </div>

                    <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                        <div className="space-y-3 mb-4">
                            <input 
                                placeholder="Item Name" 
                                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-ams-blue outline-none dark:text-white font-medium"
                                value={newItem.name}
                                onChange={e => setNewItem({...newItem, name: e.target.value})}
                            />
                            <div className="flex gap-3">
                                <input 
                                    type="number" 
                                    placeholder="Qty" 
                                    className="w-24 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 text-sm outline-none dark:text-white font-medium"
                                    value={newItem.quantity}
                                    onChange={e => setNewItem({...newItem, quantity: Number(e.target.value)})}
                                />
                                <input 
                                    type="date"
                                    className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 text-sm outline-none text-slate-600 dark:text-white font-medium"
                                    value={newItem.expiryDate || ''}
                                    onChange={e => setNewItem({...newItem, expiryDate: e.target.value})}
                                />
                            </div>
                        </div>
                        <button onClick={handleAddKitItem} className="w-full py-3 bg-ams-blue text-white font-bold rounded-xl text-sm hover:bg-blue-900 shadow-lg transition-all active:scale-95">
                            Add Item to Kit
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {showManageKitModal.contents.map((item) => (
                            <div key={item.id} className="flex justify-between items-center p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                <div>
                                    <div className="font-bold text-sm text-slate-800 dark:text-white">{item.name}</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Qty: {item.quantity} • Exp: <ExpiryBadge date={item.expiryDate} /></div>
                                </div>
                                <button onClick={() => handleRemoveKitItem(item.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        {showManageKitModal.contents.length === 0 && <div className="text-center text-slate-400 py-8 text-sm">Kit is empty.</div>}
                    </div>
                </div>
            </div>
        )}

        {/* Check / VDI Modal */}
        {activeAsset && activeAssetType && (
            <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in zoom-in duration-200">
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700">
                    <div className="p-6 bg-slate-900 dark:bg-slate-950 text-white flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-lg">{activeAssetType} Check</h3>
                            <p className="text-slate-400 text-xs font-mono mt-1">{activeAsset.id}</p>
                        </div>
                        <button onClick={() => setActiveAsset(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><XCircle className="w-6 h-6 text-slate-400" /></button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {activeAssetType === 'Vehicle' ? (
                            <div className="space-y-4">
                                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Current Mileage</label>
                                    <div className="flex items-center gap-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2">
                                        <Gauge className="w-5 h-5 text-slate-400" />
                                        <input 
                                            type="number" 
                                            className="w-full text-lg font-mono font-bold outline-none text-slate-700 dark:text-white bg-transparent"
                                            value={currentMileage}
                                            onChange={e => setCurrentMileage(Number(e.target.value))}
                                        />
                                    </div>
                                </div>
                                
                                {getChecklistForAsset(activeAsset, 'Vehicle').map((item) => (
                                    <label key={item.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:border-ams-blue transition-colors">
                                        <span className="font-medium text-sm text-slate-700 dark:text-slate-300">{item.label}</span>
                                        <input 
                                            type="checkbox" 
                                            checked={checkData[item.id] || false}
                                            onChange={e => setCheckData({...checkData, [item.id]: e.target.checked})}
                                            className="w-5 h-5 text-ams-blue rounded focus:ring-ams-blue border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-900"
                                        />
                                    </label>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {getChecklistForAsset(activeAsset, 'Kit').map((item) => (
                                    <label key={item.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:border-ams-blue transition-colors">
                                        <span className="font-medium text-sm text-slate-700 dark:text-slate-300">{item.label}</span>
                                        <input 
                                            type="checkbox" 
                                            checked={checkData[item.id] || false}
                                            onChange={e => setCheckData({...checkData, [item.id]: e.target.checked})}
                                            className="w-5 h-5 text-ams-blue rounded focus:ring-ams-blue border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-900"
                                        />
                                    </label>
                                ))}
                            </div>
                        )}

                        <div className="bg-amber-50 dark:bg-amber-900/20 p-5 rounded-2xl border border-amber-100 dark:border-amber-800 transition-all">
                            <label className="flex items-center gap-3 font-bold text-amber-800 dark:text-amber-400 mb-3 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={checkHasFault} 
                                    onChange={e => setCheckHasFault(e.target.checked)}
                                    className="w-5 h-5 text-amber-600 rounded border-amber-300 focus:ring-amber-500 bg-white dark:bg-slate-900" 
                                />
                                Report Fault / Missing Item
                            </label>
                            {checkHasFault && (
                                <textarea 
                                    className="w-full p-3 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 transition-all animate-in fade-in dark:text-white resize-none font-medium"
                                    placeholder="Describe the issue in detail..."
                                    rows={3}
                                    value={checkFaults}
                                    onChange={e => setCheckFaults(e.target.value)}
                                />
                            )}
                        </div>
                    </div>

                    <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                        <button onClick={() => setActiveAsset(null)} className="px-6 py-3 font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancel</button>
                        <button onClick={submitCheck} className="px-8 py-3 bg-ams-blue text-white font-bold rounded-xl shadow-lg hover:bg-blue-900 transition-all active:scale-95">Submit Check</button>
                    </div>
                </div>
            </div>
        )}

        {/* History Modal */}
        {showHistoryModal && (
            <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in zoom-in duration-200">
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg h-[80vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                        <h3 className="font-bold text-xl text-slate-800 dark:text-white flex items-center gap-2">
                            <History className="w-5 h-5 text-slate-500" /> Check History
                        </h3>
                        <button onClick={() => setShowHistoryModal(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><XCircle className="w-6 h-6 text-slate-400" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {assetHistory.length === 0 ? (
                            <div className="text-center text-slate-400 py-8">No history recorded.</div>
                        ) : (
                            assetHistory.map(check => (
                                <div key={check.id} className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <div className="font-bold text-slate-800 dark:text-white text-sm">{check.userName}</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400">{new Date(check.timestamp).toLocaleString()}</div>
                                        </div>
                                        <span className={`text-xs font-bold px-2 py-1 rounded ${check.status === 'Pass' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                            {check.status.toUpperCase()}
                                        </span>
                                    </div>
                                    {check.faults && check.faults.length > 0 && (
                                        <div className="mt-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
                                            <strong>Faults:</strong> {check.faults.join(', ')}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default AssetPage;