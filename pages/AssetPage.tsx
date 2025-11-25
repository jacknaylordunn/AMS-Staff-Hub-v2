
import React, { useState, useEffect } from 'react';
import { QrCode, CheckCircle, Truck, Briefcase, XCircle, AlertTriangle, Loader2, Plus, Printer, Wrench, Search, ArrowRightLeft, Calendar, FileText, History, Trash2, Save, MoreVertical, Gauge } from 'lucide-react';
import { Vehicle, MedicalKit, KitItem, AssetCheck } from '../types';
import QrScannerModal from '../components/QrScannerModal';
import { db } from '../services/firebase';
import { collection, addDoc, doc, getDoc, setDoc, onSnapshot, query, where, orderBy, updateDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';

// --- Checklist Configurations ---
const VDI_CHECKLIST = [
    { id: 'ext_tyres', label: 'Tyres (Tread & Pressure)', category: 'External' },
    { id: 'ext_lights', label: 'Lights, Sirens & Indicators', category: 'External' },
    { id: 'ext_body', label: 'Bodywork Damage Check', category: 'External' },
    { id: 'eng_fluids', label: 'Fluid Levels (Oil, Coolant, Brake)', category: 'Engine' },
    { id: 'eng_fuel', label: 'Fuel Level (> 1/4)', category: 'Engine' },
    { id: 'int_clean', label: 'Interior Cleanliness', category: 'Interior' },
    { id: 'int_equip', label: 'Medical Equipment Secure', category: 'Interior' },
];

const KIT_CHECKLIST: Record<string, string[]> = {
    'Response Bag': ['Oxygen Cylinder (>50%)', 'BVM & Masks', 'Suction Unit', 'Diagnostic Kit (BP, SpO2)'],
    'Trauma Bag': ['Dressings & Bandages', 'Tourniquets (x2)', 'Pelvic Binder', 'Splints'],
    'Drug Pack': ['JRCALC Book', 'Cannulation Pack', 'Fluids'],
    'O2 Bag': ['CD Oxygen Cylinder', 'Entonox Cylinder', 'Masks & Tubing']
};

const AssetPage = () => {
  const { user } = useAuth();
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<'Dashboard' | 'Fleet' | 'Inventory'>('Dashboard');
  const [showScanner, setShowScanner] = useState(false);
  
  // Data State
  const [fleet, setFleet] = useState<Vehicle[]>([]);
  const [kits, setKits] = useState<MedicalKit[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal/Interaction State
  const [activeAsset, setActiveAsset] = useState<Vehicle | MedicalKit | null>(null);
  const [activeAssetType, setActiveAssetType] = useState<'Vehicle' | 'Kit' | null>(null);
  const [showQrModal, setShowQrModal] = useState<string | null>(null); 
  const [showHistoryModal, setShowHistoryModal] = useState<string | null>(null);
  const [assetHistory, setAssetHistory] = useState<AssetCheck[]>([]);
  const [showManageKitModal, setShowManageKitModal] = useState<MedicalKit | null>(null);
  
  // Check Form State
  const [checkData, setCheckData] = useState<Record<string, boolean>>({});
  const [checkFaults, setCheckFaults] = useState('');
  const [checkHasFault, setCheckHasFault] = useState(false);
  const [currentMileage, setCurrentMileage] = useState<number>(0);

  // Manage Kit Form State
  const [newItem, setNewItem] = useState<Partial<KitItem>>({ name: '', quantity: 1 });

  // Load Data Realtime
  useEffect(() => {
    const unsubFleet = onSnapshot(collection(db, 'fleet'), (snap) => {
        setFleet(snap.docs.map(d => ({ id: d.id, ...d.data() } as Vehicle)));
    });
    const unsubKits = onSnapshot(collection(db, 'medical_kits'), (snap) => {
        setKits(snap.docs.map(d => ({ id: d.id, ...d.data() } as MedicalKit)));
        setLoading(false);
    });

    return () => { unsubFleet(); unsubKits(); };
  }, []);

  // Fetch History when modal opens
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
      const vehicle = fleet.find(v => v.id === code);
      if (vehicle) {
          openCheckModal(vehicle, 'Vehicle');
          return;
      }
      const kit = kits.find(k => k.id === code);
      if (kit) {
          openCheckModal(kit, 'Kit');
          return;
      }
      alert(`Asset ID ${code} not found in registry.`);
      setShowScanner(false);
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
      if (!activeAsset || !activeAssetType || !user) return;
      
      const status = checkHasFault 
        ? (activeAssetType === 'Vehicle' ? 'Maintenance' : 'Restock Needed') 
        : (activeAssetType === 'Vehicle' ? 'Operational' : 'Ready');

      try {
          const checkRecord: AssetCheck = {
              id: Date.now().toString(),
              assetId: activeAsset.id,
              assetType: activeAssetType,
              userId: user.uid,
              userName: user.name,
              timestamp: new Date().toISOString(),
              status: checkHasFault ? 'Fail' : 'Pass',
              faults: checkHasFault ? [checkFaults] : [],
              checklistData: checkData
          };
          await addDoc(collection(db, 'asset_checks'), checkRecord);

          const collectionName = activeAssetType === 'Vehicle' ? 'fleet' : 'medical_kits';
          const updates: any = {
              status: status,
              lastCheck: new Date().toISOString()
          };
          
          if (activeAssetType === 'Vehicle') {
              updates.mileage = currentMileage;
          }

          await updateDoc(doc(db, collectionName, activeAsset.id), updates);

          setActiveAsset(null);
      } catch (e) {
          console.error("Error submitting check", e);
          alert("Failed to submit check.");
      }
  };

  const handleAssignKit = async (kit: MedicalKit) => {
      if (!user) return;
      const newAssignee = kit.assignedToUser ? null : user.uid; 
      await updateDoc(doc(db, 'medical_kits', kit.id), {
          assignedToUser: newAssignee,
          status: newAssignee ? 'Ready' : kit.status 
      });
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
      await updateDoc(doc(db, 'medical_kits', showManageKitModal.id), { contents: updatedContents });
      setShowManageKitModal({ ...showManageKitModal, contents: updatedContents });
      setNewItem({ name: '', quantity: 1 });
  };

  const handleRemoveKitItem = async (itemId: string) => {
      if (!showManageKitModal) return;
      const updatedContents = showManageKitModal.contents.filter(i => i.id !== itemId);
      await updateDoc(doc(db, 'medical_kits', showManageKitModal.id), { contents: updatedContents });
      setShowManageKitModal({ ...showManageKitModal, contents: updatedContents });
  };

  const toggleVehicleStatus = async (vehicle: Vehicle) => {
      const newStatus = vehicle.status === 'Off Road' ? 'Operational' : 'Off Road';
      if (confirm(`Set ${vehicle.id} to ${newStatus}?`)) {
          await updateDoc(doc(db, 'fleet', vehicle.id), { status: newStatus });
      }
  };

  // --- Sub-Components ---

  const StatusBadge = ({ status }: { status: string }) => {
      const styles: Record<string, string> = {
          'Operational': 'bg-green-100 text-green-700 border-green-200',
          'Ready': 'bg-green-100 text-green-700 border-green-200',
          'Maintenance': 'bg-red-100 text-red-700 border-red-200',
          'Off Road': 'bg-slate-200 text-slate-700 border-slate-300',
          'Restock Needed': 'bg-amber-100 text-amber-700 border-amber-200',
          'Quarantined': 'bg-red-100 text-red-700 border-red-200',
      };
      return (
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 w-fit ${styles[status] || 'bg-slate-100 text-slate-600'}`}>
              <div className={`w-1.5 h-1.5 rounded-full bg-current`} />
              {status}
          </span>
      );
  };

  const ExpiryBadge = ({ date }: { date?: string }) => {
      if (!date) return null;
      const expiry = new Date(date);
      const now = new Date();
      const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) return <span className="text-red-600 font-bold text-[10px] bg-red-50 px-2 py-0.5 rounded border border-red-100 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Expired</span>;
      if (diffDays < 30) return <span className="text-amber-600 font-bold text-[10px] bg-amber-50 px-2 py-0.5 rounded border border-amber-100">Exp {diffDays}d</span>;
      return <span className="text-green-600 text-[10px] bg-green-50 px-2 py-0.5 rounded border border-green-100 font-medium font-mono">{date}</span>;
  };

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-ams-blue" /></div>;

  return (
    <div className="space-y-6">
        {/* Header & Tabs */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Asset & Fleet Management</h1>
                <p className="text-slate-500 font-medium">Track vehicle readiness, equipment, and stock levels.</p>
            </div>
            <div className="flex flex-wrap gap-3 w-full md:w-auto">
                <div className="flex bg-slate-100 p-1.5 rounded-xl">
                    {(['Dashboard', 'Fleet', 'Inventory'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${
                                activeTab === tab ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
                <button 
                    onClick={() => setShowScanner(true)}
                    className="flex items-center gap-2 px-5 py-3 bg-ams-dark text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all hover:scale-105"
                >
                    <QrCode className="w-4 h-4" /> Scan Asset
                </button>
            </div>
        </div>

        {/* --- DASHBOARD VIEW --- */}
        {activeTab === 'Dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in">
                {/* Fleet Stats */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-4 bg-blue-50 text-ams-blue rounded-xl"><Truck className="w-6 h-6" /></div>
                        <span className="text-3xl font-bold text-slate-800">{fleet.length}</span>
                    </div>
                    <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-4">Fleet Status</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm p-3 bg-green-50 rounded-xl border border-green-100">
                            <span className="text-green-800 font-bold">Operational</span>
                            <span className="font-bold text-green-800 bg-white px-2 rounded">{fleet.filter(v => v.status === 'Operational').length}</span>
                        </div>
                        <div className="flex justify-between text-sm p-3 bg-red-50 rounded-xl border border-red-100">
                            <span className="text-red-800 font-bold">Maintenance / Off Road</span>
                            <span className="font-bold text-red-800 bg-white px-2 rounded">{fleet.filter(v => v.status === 'Maintenance' || v.status === 'Off Road').length}</span>
                        </div>
                    </div>
                </div>

                {/* Kit Stats */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-4 bg-green-50 text-green-600 rounded-xl"><Briefcase className="w-6 h-6" /></div>
                        <span className="text-3xl font-bold text-slate-800">{kits.length}</span>
                    </div>
                    <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-4">Inventory Health</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm p-3 bg-green-50 rounded-xl border border-green-100">
                            <span className="text-green-800 font-bold">Ready for Use</span>
                            <span className="font-bold text-green-800 bg-white px-2 rounded">{kits.filter(k => k.status === 'Ready').length}</span>
                        </div>
                        <div className="flex justify-between text-sm p-3 bg-amber-50 rounded-xl border border-amber-100">
                            <span className="text-amber-800 font-bold">Restock Needed</span>
                            <span className="font-bold text-amber-800 bg-white px-2 rounded">{kits.filter(k => k.status === 'Restock Needed').length}</span>
                        </div>
                    </div>
                </div>

                {/* Logistics Alerts */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-4 bg-red-50 text-red-600 rounded-xl"><AlertTriangle className="w-6 h-6" /></div>
                        <span className="text-3xl font-bold text-slate-800">
                            {kits.reduce((acc, kit) => acc + kit.contents.filter(i => {
                                if(!i.expiryDate) return false;
                                return new Date(i.expiryDate) < new Date();
                            }).length, 0)}
                        </span>
                    </div>
                    <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Critical Alerts</h3>
                    <p className="text-sm text-slate-500 mt-2 font-medium">Expired items detected across all kits.</p>
                    <button onClick={() => setActiveTab('Inventory')} className="mt-auto pt-4 text-sm font-bold text-ams-blue hover:underline flex items-center gap-2">
                        View Inventory <ArrowRightLeft className="w-4 h-4" />
                    </button>
                </div>
            </div>
        )}

        {/* --- FLEET VIEW --- */}
        {activeTab === 'Fleet' && (
            <div className="animate-in fade-in">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-slate-700">Vehicle Registry</h2>
                    <button 
                        onClick={() => {
                            const reg = prompt("Vehicle Registration:");
                            const callSign = prompt("Call Sign:");
                            const type = prompt("Type (Ambulance/RRV):");
                            if (reg && callSign) {
                                setDoc(doc(db, 'fleet', reg), {
                                    id: reg, registration: reg, callSign, type, status: 'Operational', mileage: 0, lastCheck: new Date().toISOString()
                                });
                            }
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold shadow-sm hover:bg-slate-50 text-slate-600"
                    >
                        <Plus className="w-4 h-4" /> Add Vehicle
                    </button>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs border-b border-slate-200">
                            <tr>
                                <th className="p-5">Registration</th>
                                <th className="p-5">Call Sign</th>
                                <th className="p-5">Status</th>
                                <th className="p-5">Mileage</th>
                                <th className="p-5">Last Check</th>
                                <th className="p-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {fleet.map(v => (
                                <tr key={v.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="p-5 font-bold text-slate-800">{v.registration}</td>
                                    <td className="p-5">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{v.callSign}</span>
                                            <span className="px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-500">{v.type}</span>
                                        </div>
                                    </td>
                                    <td className="p-5"><StatusBadge status={v.status} /></td>
                                    <td className="p-5 font-mono text-slate-600">{v.mileage.toLocaleString()} mi</td>
                                    <td className="p-5 text-slate-500 text-xs font-medium">
                                        {v.lastCheck ? new Date(v.lastCheck).toLocaleDateString() : 'Never'}
                                    </td>
                                    <td className="p-5 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => toggleVehicleStatus(v)} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500" title="Toggle Status">
                                                <Wrench className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => setShowHistoryModal(v.id)} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500" title="History">
                                                <History className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => openCheckModal(v, 'Vehicle')} className="p-2 bg-ams-blue hover:bg-blue-700 text-white rounded-lg shadow-sm" title="VDI Check">
                                                <CheckCircle className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => setShowQrModal(v.id)} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500" title="QR">
                                                <Printer className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* --- INVENTORY VIEW --- */}
        {activeTab === 'Inventory' && (
            <div className="animate-in fade-in">
                 <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-slate-700">Medical Kits & Equipment</h2>
                    <button 
                         onClick={() => {
                             const id = prompt("Kit ID (e.g. RB-01):");
                             const type = prompt("Type (Response Bag/Trauma Bag):");
                             if (id && type) {
                                 setDoc(doc(db, 'medical_kits', id), {
                                     id, name: id, type, status: 'Ready', contents: []
                                 });
                             }
                         }}
                         className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold shadow-sm hover:bg-slate-50 text-slate-600"
                    >
                        <Plus className="w-4 h-4" /> Add Kit
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {kits.map(kit => (
                        <div key={kit.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow group relative">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-slate-100 rounded-xl text-slate-500"><Briefcase className="w-6 h-6" /></div>
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-800">{kit.id}</h3>
                                        <p className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded w-fit mt-1">{kit.type}</p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                     <StatusBadge status={kit.status} />
                                     <button onClick={() => setShowHistoryModal(kit.id)} className="text-xs text-slate-400 hover:text-ams-blue flex items-center gap-1 font-medium mt-1">
                                        <History className="w-3 h-3" /> History
                                     </button>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <div 
                                    className="p-4 bg-slate-50/50 border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-50 hover:border-slate-200 transition-all"
                                    onClick={() => setShowManageKitModal(kit)}
                                >
                                    <div className="flex justify-between items-center mb-3">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contents ({kit.contents.length})</p>
                                        <span className="text-xs text-ams-blue font-bold flex items-center gap-1">Manage <ArrowRightLeft className="w-3 h-3" /></span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {kit.contents.length > 0 ? kit.contents.slice(0, 4).map(i => (
                                            <span key={i.id} className="text-[10px] bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded-md font-medium">
                                                {i.name}
                                            </span>
                                        )) : <span className="text-xs text-slate-400 italic">No items listed</span>}
                                        {kit.contents.length > 4 && <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded-md font-medium">+{kit.contents.length - 4}</span>}
                                    </div>
                                    {/* Expiry Warning */}
                                    {kit.contents.some(i => i.expiryDate && new Date(i.expiryDate) < new Date(Date.now() + 30*24*60*60*1000)) && (
                                        <div className="mt-3 text-xs font-bold text-red-600 flex items-center gap-1.5 bg-red-50 p-2 rounded-lg w-fit">
                                            <AlertTriangle className="w-3 h-3" /> Expiry Warning
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                                    <div className="text-xs text-slate-500">
                                        Assigned: <span className="font-bold text-slate-700">{kit.assignedToUser ? 'Crew' : 'Stores'}</span>
                                    </div>
                                    <div className="flex gap-2">
                                         <button 
                                            onClick={() => handleAssignKit(kit)}
                                            className={`text-xs font-bold px-3 py-2 rounded-lg border transition-colors ${kit.assignedToUser === user?.uid ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                         >
                                             {kit.assignedToUser === user?.uid ? 'Return' : 'Sign Out'}
                                         </button>
                                         <button 
                                            onClick={() => openCheckModal(kit, 'Kit')}
                                            className="text-xs font-bold px-3 py-2 rounded-lg bg-ams-blue text-white hover:bg-blue-900 shadow-sm"
                                         >
                                             Check
                                         </button>
                                         <button 
                                            onClick={() => setShowQrModal(kit.id)}
                                            className="text-xs font-bold px-2 py-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                                         >
                                             <Printer className="w-4 h-4" />
                                         </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* --- MODALS --- */}
        
        {showScanner && (
            <QrScannerModal onScan={handleScanComplete} onClose={() => setShowScanner(false)} />
        )}

        {/* QR Printer Modal */}
        {showQrModal && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in zoom-in duration-200">
                <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
                    <h3 className="text-xl font-bold mb-6 text-slate-800">Print Asset Tag</h3>
                    <div className="bg-white border-4 border-slate-900 p-6 rounded-2xl inline-block mb-6 shadow-xl transform rotate-2">
                        <QrCode className="w-40 h-40 text-slate-900 mx-auto" />
                        <p className="mt-4 font-mono font-bold text-2xl tracking-widest text-slate-900">{showQrModal}</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-1">Property of Aegis Medical</p>
                    </div>
                    <div className="flex gap-3 justify-center">
                        <button onClick={() => setShowQrModal(null)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors">Close</button>
                        <button onClick={() => { alert("Sent to label printer."); setShowQrModal(null); }} className="flex-1 py-3 bg-ams-blue text-white rounded-xl font-bold hover:bg-blue-900 shadow-lg transition-all">Print Label</button>
                    </div>
                </div>
            </div>
        )}

        {/* History Modal */}
        {showHistoryModal && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-8">
                    <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                        <div>
                            <h3 className="font-bold text-xl text-slate-800">Audit History</h3>
                            <p className="text-xs text-slate-500 font-mono mt-1">{showHistoryModal}</p>
                        </div>
                        <button onClick={() => setShowHistoryModal(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><XCircle className="w-6 h-6 text-slate-400" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
                        {assetHistory.length === 0 && <div className="text-center text-slate-400 italic py-12 bg-white rounded-2xl border border-dashed border-slate-200">No history recorded for this asset.</div>}
                        {assetHistory.map(check => (
                            <div key={check.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">{new Date(check.timestamp).toLocaleString()}</p>
                                        <p className="text-xs text-slate-500 font-medium">Checked by {check.userName}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${check.status === 'Pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {check.status.toUpperCase()}
                                    </span>
                                </div>
                                {check.faults.length > 0 && (
                                    <div className="mt-3 bg-red-50 p-3 rounded-xl border border-red-100">
                                        <p className="text-xs font-bold text-red-700 mb-2 uppercase tracking-wide">Faults Reported</p>
                                        {check.faults.map((f, i) => <p key={i} className="text-sm text-slate-700 flex items-center gap-2"><AlertTriangle className="w-3 h-3 text-red-500" /> {f}</p>)}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* Manage Kit Content Modal */}
        {showManageKitModal && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in zoom-in duration-200">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg h-[80vh] flex flex-col overflow-hidden">
                    <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                         <div>
                            <h3 className="font-bold text-xl text-slate-800">Manage Kit Contents</h3>
                            <p className="text-xs text-slate-500 font-medium">{showManageKitModal.id}</p>
                        </div>
                        <button onClick={() => setShowManageKitModal(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><XCircle className="w-6 h-6 text-slate-400" /></button>
                    </div>

                    <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                        <div className="space-y-3 mb-4">
                            <input 
                                placeholder="Item Name" 
                                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-ams-blue outline-none"
                                value={newItem.name}
                                onChange={e => setNewItem({...newItem, name: e.target.value})}
                            />
                            <div className="flex gap-3">
                                <input 
                                    type="number" 
                                    placeholder="Qty" 
                                    className="w-24 bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none"
                                    value={newItem.quantity}
                                    onChange={e => setNewItem({...newItem, quantity: Number(e.target.value)})}
                                />
                                <input 
                                    type="date"
                                    className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none text-slate-600"
                                    value={newItem.expiryDate || ''}
                                    onChange={e => setNewItem({...newItem, expiryDate: e.target.value})}
                                />
                            </div>
                        </div>
                        <button onClick={handleAddKitItem} className="w-full py-3 bg-ams-blue text-white font-bold rounded-xl text-sm hover:bg-blue-900 shadow-lg transition-all active:scale-95">
                            Add Item to Kit
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-slate-50/30">
                        {showManageKitModal.contents.length === 0 && <p className="text-slate-400 text-center text-sm py-8 italic">Kit is currently empty.</p>}
                        {showManageKitModal.contents.map(item => (
                            <div key={item.id} className="flex justify-between items-center p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-ams-light-blue transition-colors">
                                <div>
                                    <p className="text-sm font-bold text-slate-800">{item.name}</p>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium">Qty: {item.quantity}</span>
                                        <ExpiryBadge date={item.expiryDate} />
                                    </div>
                                </div>
                                <button onClick={() => handleRemoveKitItem(item.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* Check / VDI Modal */}
        {activeAsset && activeAssetType && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in zoom-in duration-200">
                <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
                    <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-lg">{activeAssetType} Check</h3>
                            <p className="text-slate-400 text-xs font-mono mt-1">{activeAsset.id}</p>
                        </div>
                        <button onClick={() => setActiveAsset(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><XCircle className="w-6 h-6 text-slate-400" /></button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {activeAssetType === 'Vehicle' ? (
                            <div className="space-y-4">
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Current Mileage</label>
                                    <div className="flex items-center gap-3 bg-white border border-slate-300 rounded-lg px-3 py-2">
                                        <Gauge className="w-5 h-5 text-slate-400" />
                                        <input 
                                            type="number" 
                                            className="w-full text-lg font-mono font-bold outline-none text-slate-700"
                                            value={currentMileage}
                                            onChange={e => setCurrentMileage(Number(e.target.value))}
                                        />
                                    </div>
                                </div>
                                {VDI_CHECKLIST.map(item => (
                                    <label key={item.id} className="flex items-center justify-between p-4 border rounded-xl hover:bg-slate-50 cursor-pointer transition-colors group">
                                        <div>
                                            <span className="font-bold text-slate-700 block group-hover:text-ams-blue transition-colors">{item.label}</span>
                                            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">{item.category}</span>
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            className="w-6 h-6 rounded border-slate-300 text-green-600 focus:ring-green-500"
                                            checked={!!checkData[item.id]}
                                            onChange={() => setCheckData({...checkData, [item.id]: !checkData[item.id]})}
                                        />
                                    </label>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {(activeAsset as MedicalKit).contents.length > 0 ? (
                                    (activeAsset as MedicalKit).contents.map(item => (
                                        <label key={item.id} className="flex items-center justify-between p-4 border rounded-xl hover:bg-slate-50 cursor-pointer transition-colors group">
                                            <div>
                                                <span className="font-bold text-slate-700 block group-hover:text-ams-blue">{item.name}</span>
                                                <div className="flex gap-3 text-xs text-slate-500 mt-1">
                                                    <span className="font-medium bg-slate-100 px-1.5 py-0.5 rounded">Qty: {item.quantity}</span>
                                                    {item.expiryDate && <ExpiryBadge date={item.expiryDate} />}
                                                </div>
                                            </div>
                                            <input 
                                                type="checkbox" 
                                                className="w-6 h-6 rounded border-slate-300 text-green-600 focus:ring-green-500"
                                                checked={!!checkData[item.id]}
                                                onChange={() => setCheckData({...checkData, [item.id]: !checkData[item.id]})}
                                            />
                                        </label>
                                    ))
                                ) : (
                                    <div className="text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                        <p className="text-slate-500 font-medium">No specific items listed.</p>
                                        <p className="text-xs text-slate-400 mt-1">Performing generic category checks.</p>
                                        <div className="mt-6 space-y-2 text-left px-4">
                                             {KIT_CHECKLIST[(activeAsset as MedicalKit).type]?.map(label => (
                                                <label key={label} className="flex items-center justify-between p-3 border bg-white rounded-lg hover:border-ams-blue transition-colors">
                                                    <span className="font-bold text-slate-700 text-sm">{label}</span>
                                                    <input 
                                                        type="checkbox" 
                                                        className="w-5 h-5 rounded text-green-600 focus:ring-green-500 border-slate-300"
                                                        checked={!!checkData[label]}
                                                        onChange={() => setCheckData({...checkData, [label]: !checkData[label]})}
                                                    />
                                                </label>
                                             ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 transition-all">
                            <label className="flex items-center gap-3 font-bold text-amber-800 mb-3 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={checkHasFault} 
                                    onChange={e => setCheckHasFault(e.target.checked)}
                                    className="w-5 h-5 text-amber-600 rounded border-amber-300 focus:ring-amber-500" 
                                />
                                Report Fault / Missing Item
                            </label>
                            {checkHasFault && (
                                <textarea 
                                    className="w-full p-3 text-sm bg-white border border-amber-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 transition-all animate-in fade-in"
                                    placeholder="Describe the issue in detail..."
                                    rows={3}
                                    value={checkFaults}
                                    onChange={e => setCheckFaults(e.target.value)}
                                />
                            )}
                        </div>
                    </div>

                    <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-4">
                        <button 
                            onClick={() => {
                                const allKeys: any = {};
                                if (activeAssetType === 'Vehicle') VDI_CHECKLIST.forEach(i => allKeys[i.id] = true);
                                else if ((activeAsset as MedicalKit).contents.length > 0) (activeAsset as MedicalKit).contents.forEach(i => allKeys[i.id] = true);
                                else KIT_CHECKLIST[(activeAsset as MedicalKit).type]?.forEach(i => allKeys[i] = true);
                                setCheckData(allKeys);
                            }}
                            className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors border border-slate-200 bg-white"
                        >
                            Pass All
                        </button>
                        <button 
                            onClick={submitCheck}
                            className={`flex-1 py-3 text-white font-bold rounded-xl transition-all shadow-lg active:scale-95 ${checkHasFault ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-600 hover:bg-green-700'}`}
                        >
                            {checkHasFault ? `Submit ${activeAssetType === 'Vehicle' ? 'Fault' : 'Restock Req'}` : 'Sign Off'}
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default AssetPage;
