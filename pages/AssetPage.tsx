
import React, { useState, useEffect } from 'react';
import { Truck, Briefcase, Search, QrCode, AlertTriangle, CheckCircle, Clock, History, Loader2, X, Plus, Filter, Wrench, Edit3, Trash2, Save, Printer, ListPlus, MinusCircle, RefreshCcw, Copy, Camera } from 'lucide-react';
import { db } from '../services/firebase';
import { collection, onSnapshot, query, orderBy, where, updateDoc, doc, addDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { Vehicle, MedicalKit, AssetCheck, ChecklistItem, Role } from '../types';
import QrScannerModal from '../components/QrScannerModal';
import { DEFAULT_VDI_CHECKLIST, DEFAULT_KIT_CHECKLIST_ITEMS } from '../data/assetDefaults';
import { useToast } from '../context/ToastContext';
import QRCode from 'qrcode';

const StatusBadge = ({ status }: { status: string }) => {
    let color = 'bg-slate-100 text-slate-600';
    if (status === 'Operational' || status === 'Ready') color = 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (status === 'Maintenance' || status === 'Restock Needed') color = 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    if (status === 'Off Road' || status === 'Quarantined') color = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    
    return <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${color}`}>{status}</span>;
};

const ExpiryBadge = ({ date }: { date: string }) => {
    const d = new Date(date);
    const now = new Date();
    const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    
    let color = 'text-green-600 dark:text-green-400';
    if (diff < 0) color = 'text-red-600 dark:text-red-400 font-bold';
    else if (diff < 30) color = 'text-amber-600 dark:text-amber-400 font-bold';
    
    return <span className={`font-mono ${color}`}>{d.toLocaleDateString()}</span>;
};

const AssetPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isManager = user?.role === Role.Manager || user?.role === Role.Admin;

  const [activeTab, setActiveTab] = useState<'Vehicles' | 'Kits'>('Vehicles');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [kits, setKits] = useState<MedicalKit[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Scanner State
  const [showScanner, setShowScanner] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Manual Entry State (Non-Manager)
  const [manualId, setManualId] = useState('');

  // Asset Editor State (Create & Edit)
  const [showEditor, setShowEditor] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editorType, setEditorType] = useState<'Vehicle' | 'Kit'>('Vehicle');
  const [editorData, setEditorData] = useState<any>({}); // Holds Partial<Vehicle> or Partial<Kit>
  
  // Checklist Editor State
  const [newCheckItemLabel, setNewCheckItemLabel] = useState('');
  const [newCheckItemCategory, setNewCheckItemCategory] = useState('');

  // QR Modal State
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [qrAsset, setQrAsset] = useState<any>(null);

  // Check Modal State
  const [checkModalOpen, setCheckModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Vehicle | MedicalKit | null>(null);
  const [checkType, setCheckType] = useState<'Vehicle' | 'Kit'>('Vehicle');
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [faults, setFaults] = useState<string>('');

  // History Modal
  const [historyModalId, setHistoryModalId] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<AssetCheck[]>([]);

  useEffect(() => {
    const unsubVehicles = onSnapshot(collection(db, 'fleet'), (snap) => {
        setVehicles(snap.docs.map(d => ({ id: d.id, ...d.data() } as Vehicle)));
    });
    const unsubKits = onSnapshot(collection(db, 'medical_kits'), (snap) => {
        setKits(snap.docs.map(d => ({ id: d.id, ...d.data() } as MedicalKit)));
        setLoading(false);
    });
    
    // Check URL for scan action
    if (window.location.hash.includes('action=scan')) {
        setShowScanner(true);
    }

    return () => { unsubVehicles(); unsubKits(); };
  }, []);

  useEffect(() => {
      if (historyModalId) {
          const q = query(collection(db, 'asset_checks'), where('assetId', '==', historyModalId), orderBy('timestamp', 'desc'));
          const unsub = onSnapshot(q, (snap) => {
              setHistoryData(snap.docs.map(d => ({ id: d.id, ...d.data() } as AssetCheck)));
          });
          return () => unsub();
      }
  }, [historyModalId]);

  const handleScanComplete = (code: string) => {
      setShowScanner(false);
      // Try find vehicle (match ID or Callsign)
      const v = vehicles.find(x => x.id === code || x.callSign.toUpperCase() === code.toUpperCase());
      if (v) {
          openCheckModal(v, 'Vehicle');
          return;
      }
      // Try find kit (match ID or Name)
      const k = kits.find(x => x.id === code || x.name.toUpperCase() === code.toUpperCase());
      if (k) {
          openCheckModal(k, 'Kit');
          return;
      }
      toast.error("Asset not found in database.");
  };

  const handleManualSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(manualId) {
          handleScanComplete(manualId);
          setManualId('');
      }
  };

  // --- Editor Logic ---

  const handleCreateNew = () => {
      setEditorType(activeTab === 'Vehicles' ? 'Vehicle' : 'Kit');
      setEditorData(activeTab === 'Vehicles' ? { status: 'Operational', type: 'Ambulance', checklist: DEFAULT_VDI_CHECKLIST } : { status: 'Ready', type: 'Response Bag', checklist: [] });
      setIsEditing(false);
      setShowEditor(true);
  };

  const handleEditAsset = (asset: any, type: 'Vehicle' | 'Kit') => {
      setEditorType(type);
      // Ensure checklist exists in editor data, fallback to defaults if missing for Vehicles, or empty for kits if really empty
      let currentChecklist = asset.checklist;
      if (!currentChecklist) {
          if (type === 'Vehicle') currentChecklist = DEFAULT_VDI_CHECKLIST;
          else {
              // Try to find default for kit type
              const defaults = DEFAULT_KIT_CHECKLIST_ITEMS[asset.type] || [];
              currentChecklist = defaults.map(s => ({ id: s, label: s, category: 'General' }));
          }
      }
      
      setEditorData({ ...asset, checklist: currentChecklist });
      setIsEditing(true);
      setShowEditor(true);
  };

  const handleSaveAsset = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          const collectionName = editorType === 'Vehicle' ? 'fleet' : 'medical_kits';
          
          if (isEditing && editorData.id) {
              // Update
              await updateDoc(doc(db, collectionName, editorData.id), editorData);
              toast.success("Asset updated");
          } else {
              // Create
              await addDoc(collection(db, collectionName), {
                  ...editorData,
                  lastCheck: null
              });
              toast.success("Asset created");
          }
          setShowEditor(false);
      } catch (err) {
          console.error(err);
          toast.error("Failed to save asset");
      }
  };

  const handleDeleteAsset = async () => {
      if (!editorData.id || !confirm("Are you sure you want to permanently delete this asset? This cannot be undone.")) return;
      try {
          const collectionName = editorType === 'Vehicle' ? 'fleet' : 'medical_kits';
          await deleteDoc(doc(db, collectionName, editorData.id));
          toast.success("Asset deleted");
          setShowEditor(false);
      } catch (err) {
          toast.error("Failed to delete");
      }
  };

  const handleQuickDelete = async (asset: Vehicle | MedicalKit, type: 'Vehicle' | 'Kit') => {
      if (!confirm(`Are you sure you want to DELETE ${type === 'Vehicle' ? (asset as Vehicle).callSign : (asset as MedicalKit).name}? This cannot be undone.`)) return;
      try {
          const collectionName = type === 'Vehicle' ? 'fleet' : 'medical_kits';
          await deleteDoc(doc(db, collectionName, asset.id));
          toast.success(`${type} deleted successfully`);
      } catch (e) {
          console.error(e);
          toast.error("Failed to delete asset");
      }
  };

  // Checklist Manipulation
  const addChecklistItem = () => {
      if (!newCheckItemLabel) return;
      const newItem: ChecklistItem = {
          id: `chk_${Date.now()}`,
          label: newCheckItemLabel,
          category: newCheckItemCategory || 'General'
      };
      setEditorData({ ...editorData, checklist: [...(editorData.checklist || []), newItem] });
      setNewCheckItemLabel('');
  };

  const removeChecklistItem = (id: string) => {
      setEditorData({ ...editorData, checklist: (editorData.checklist || []).filter((i: ChecklistItem) => i.id !== id) });
  };

  const resetChecklist = () => {
      if (!confirm("Reset to system default checklist?")) return;
      if (editorType === 'Vehicle') {
          setEditorData({ ...editorData, checklist: DEFAULT_VDI_CHECKLIST });
      } else {
          const defaults = DEFAULT_KIT_CHECKLIST_ITEMS[editorData.type] || [];
          const items = defaults.map(s => ({ id: s, label: s, category: 'General' }));
          setEditorData({ ...editorData, checklist: items });
      }
  };

  // --- QR Logic ---
  const handleGenerateQr = async (asset: any) => {
      try {
          setQrAsset(asset);
          const url = await QRCode.toDataURL(asset.id, { width: 400 });
          setQrUrl(url);
          setShowQrModal(true);
      } catch (e) {
          console.error(e);
          toast.error("Failed to generate QR");
      }
  };

  const printQr = () => {
      const win = window.open('', '', 'width=600,height=600');
      if (win) {
          win.document.write(`
              <html>
                  <head>
                    <title>Print QR - ${qrAsset.callSign || qrAsset.name}</title>
                    <style>
                        body { 
                            font-family: 'Helvetica', sans-serif; 
                            display: flex; 
                            justify-content: center; 
                            align-items: center; 
                            height: 100vh; 
                            margin: 0; 
                        }
                        .label {
                            border: 2px solid black;
                            border-radius: 10px;
                            padding: 20px;
                            text-align: center;
                            width: 350px;
                        }
                        .header {
                            font-size: 10px;
                            font-weight: bold;
                            text-transform: uppercase;
                            margin-bottom: 10px;
                        }
                        .asset-name {
                            font-size: 24px;
                            font-weight: 800;
                            margin: 5px 0;
                        }
                        .asset-id {
                            font-family: monospace;
                            font-size: 12px;
                            margin-bottom: 10px;
                        }
                        .contact-info {
                            font-size: 10px;
                            margin-top: 15px;
                            line-height: 1.4;
                        }
                        .staff-info {
                            font-size: 8px;
                            margin-top: 10px;
                            font-style: italic;
                            color: #666;
                            border-top: 1px dashed #ccc;
                            padding-top: 5px;
                        }
                        .warning {
                            font-weight: bold;
                            color: #d00;
                        }
                    </style>
                  </head>
                  <body>
                      <div class="label">
                          <div class="header">Property of Aegis Medical Solutions</div>
                          <div class="asset-name">${qrAsset.callSign || qrAsset.name}</div>
                          <div class="asset-id">ID: ${qrAsset.id}</div>
                          <img src="${qrUrl}" width="200" height="200" />
                          
                          <div class="contact-info">
                              <strong>IF FOUND PLEASE CONTACT:</strong><br/>
                              01865 965673<br/>
                              contact@aegismedicalsolutions.co.uk<br/>
                              <br/>
                              <span class="warning">Or dial 999 and ask for Police</span>
                          </div>

                          <div class="staff-info">
                              STAFF: Scan in App to perform checks or report defects.
                          </div>
                      </div>
                      <script>window.print();</script>
                  </body>
              </html>
          `);
          win.document.close();
      }
  };

  // --- Check Logic ---

  const openCheckModal = (asset: Vehicle | MedicalKit, type: 'Vehicle' | 'Kit') => {
      setSelectedAsset(asset);
      setCheckType(type);
      setChecklist({});
      setFaults('');
      
      // Initialize checklist
      let items: ChecklistItem[] = (asset as any).checklist;
      
      // Fallback if no custom checklist found
      if (!items || items.length === 0) {
          if (type === 'Vehicle') items = DEFAULT_VDI_CHECKLIST;
          else {
              const defaults = DEFAULT_KIT_CHECKLIST_ITEMS[(asset as MedicalKit).type || 'Response Bag'] || [];
              items = defaults.map(s => ({id: s, label: s, category: 'General'}));
          }
      }
      
      const init: Record<string, boolean> = {};
      items.forEach(i => init[i.id] = false);
      setChecklist(init);
      
      setCheckModalOpen(true);
  };

  const submitCheck = async () => {
      if (!selectedAsset || !user) return;
      
      const isFailed = faults.length > 0; // Simple logic: any faults entered = fail
      
      const checkData: AssetCheck = {
          id: Date.now().toString(),
          assetId: selectedAsset.id,
          assetType: checkType,
          userId: user.uid,
          userName: user.name,
          timestamp: new Date().toISOString(),
          status: isFailed ? 'Fail' : 'Pass',
          faults: faults ? [faults] : [],
          checklistData: checklist
      };

      try {
          await addDoc(collection(db, 'asset_checks'), checkData);
          
          const collectionName = checkType === 'Vehicle' ? 'fleet' : 'medical_kits';
          const statusField = checkType === 'Vehicle' ? (isFailed ? 'Maintenance' : 'Operational') : (isFailed ? 'Restock Needed' : 'Ready');
          
          await updateDoc(doc(db, collectionName, selectedAsset.id), {
              status: statusField,
              lastCheck: new Date().toISOString()
          });

          toast.success("Check submitted successfully");
          setCheckModalOpen(false);
      } catch (e) {
          console.error(e);
          toast.error("Failed to submit check");
      }
  };

  const filteredVehicles = vehicles.filter(v => 
      v.callSign.toLowerCase().includes(searchTerm.toLowerCase()) || 
      v.registration.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredKits = kits.filter(k => 
      k.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      k.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-ams-blue" /></div>;

  return (
    <div className="min-h-screen pb-20">
      
      {isManager ? (
        // --- MANAGER VIEW (Full Dashboard) ---
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Assets & Fleet</h1>
                    <p className="text-slate-500 dark:text-slate-400">Manage vehicles, equipment bags, and perform checks.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleCreateNew} className="flex items-center gap-2 px-4 py-3 bg-slate-800 dark:bg-slate-700 text-white rounded-xl font-bold shadow-md hover:bg-slate-700 dark:hover:bg-slate-600 transition-all">
                        <Plus className="w-5 h-5" /> Add Asset
                    </button>
                    <button onClick={() => setShowScanner(true)} className="flex items-center gap-2 px-6 py-3 bg-ams-blue text-white rounded-xl font-bold shadow-md hover:bg-blue-900 transition-all">
                        <QrCode className="w-5 h-5" /> Perform Check
                    </button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                    <button onClick={() => setActiveTab('Vehicles')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'Vehicles' ? 'bg-white dark:bg-slate-600 shadow text-ams-blue dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>Vehicles</button>
                    <button onClick={() => setActiveTab('Kits')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'Kits' ? 'bg-white dark:bg-slate-600 shadow text-ams-blue dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>Medical Kits</button>
                </div>
                
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input 
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-ams-blue text-slate-900 dark:text-white"
                        placeholder={activeTab === 'Vehicles' ? "Search Reg/Callsign..." : "Search Kit Name..."}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Asset Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeTab === 'Vehicles' ? filteredVehicles.map(vehicle => (
                    <div key={vehicle.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                        <div className="p-5">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                                    <Truck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <StatusBadge status={vehicle.status} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">{vehicle.callSign}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-mono mb-4">{vehicle.registration}</p>
                            
                            <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1 border-t border-slate-100 dark:border-slate-700 pt-3">
                                <p className="flex justify-between"><span>Type:</span> <span className="font-bold">{vehicle.type}</span></p>
                                <p className="flex justify-between"><span>Last Check:</span> <span>{vehicle.lastCheck ? new Date(vehicle.lastCheck).toLocaleDateString() : 'Never'}</span></p>
                            </div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-3 flex gap-2 border-t border-slate-200 dark:border-slate-700">
                            <button onClick={() => openCheckModal(vehicle, 'Vehicle')} className="flex-1 py-2 bg-ams-blue text-white rounded-lg text-sm font-bold hover:bg-blue-900 transition-colors">Start VDI</button>
                            <button onClick={() => setHistoryModalId(vehicle.id)} className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:text-ams-blue transition-colors" title="History"><History className="w-5 h-5" /></button>
                            <button onClick={() => handleGenerateQr(vehicle)} className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:text-ams-blue transition-colors" title="QR Code"><QrCode className="w-5 h-5" /></button>
                            <button onClick={() => handleEditAsset(vehicle, 'Vehicle')} className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:text-ams-blue transition-colors" title="Edit"><Edit3 className="w-5 h-5" /></button>
                            <button onClick={() => handleQuickDelete(vehicle, 'Vehicle')} className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900 rounded-lg text-red-500 hover:text-red-700 transition-colors" title="Delete"><Trash2 className="w-5 h-5" /></button>
                        </div>
                    </div>
                )) : filteredKits.map(kit => (
                    <div key={kit.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                        <div className="p-5">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
                                    <Briefcase className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <StatusBadge status={kit.status} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">{kit.name}</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{kit.type}</p>
                            
                            <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1 border-t border-slate-100 dark:border-slate-700 pt-3 mt-3">
                                <p className="flex justify-between"><span>Last Check:</span> <span>{kit.lastCheck ? new Date(kit.lastCheck).toLocaleDateString() : 'Never'}</span></p>
                                {kit.earliestExpiry && <p className="flex justify-between"><span>Earliest Exp:</span> <ExpiryBadge date={kit.earliestExpiry} /></p>}
                            </div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-3 flex gap-2 border-t border-slate-200 dark:border-slate-700">
                            <button onClick={() => openCheckModal(kit, 'Kit')} className="flex-1 py-2 bg-ams-blue text-white rounded-lg text-sm font-bold hover:bg-blue-900 transition-colors">Check Kit</button>
                            <button onClick={() => setHistoryModalId(kit.id)} className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:text-ams-blue transition-colors" title="History"><History className="w-5 h-5" /></button>
                            <button onClick={() => handleGenerateQr(kit)} className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:text-ams-blue transition-colors" title="QR Code"><QrCode className="w-5 h-5" /></button>
                            <button onClick={() => handleEditAsset(kit, 'Kit')} className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:text-ams-blue transition-colors" title="Edit"><Edit3 className="w-5 h-5" /></button>
                            <button onClick={() => handleQuickDelete(kit, 'Kit')} className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900 rounded-lg text-red-500 hover:text-red-700 transition-colors" title="Delete"><Trash2 className="w-5 h-5" /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      ) : (
        // --- NON-MANAGER VIEW (Simplified) ---
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 space-y-8 animate-in fade-in">
            <div className="text-center space-y-4 max-w-md">
                <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto shadow-sm">
                    <QrCode className="w-12 h-12 text-ams-blue" />
                </div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Asset Verification</h1>
                <p className="text-slate-500 dark:text-slate-400">
                    Scan the QR code on a Vehicle or Medical Kit to begin your pre-shift or post-usage inspection.
                </p>
            </div>

            <button 
                onClick={() => setShowScanner(true)}
                className="w-full max-w-sm py-4 bg-ams-blue text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-900/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 transform active:scale-95"
            >
                <Camera className="w-6 h-6" /> Scan QR Code
            </button>

            <div className="relative w-full max-w-sm">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-slate-50 dark:bg-[#0F1115] px-2 text-slate-500 font-bold">Or enter manually</span>
                </div>
            </div>

            <form onSubmit={handleManualSubmit} className="w-full max-w-sm flex gap-2">
                <input 
                    className="flex-1 input-field uppercase"
                    placeholder="Asset ID / Callsign..."
                    value={manualId}
                    onChange={e => setManualId(e.target.value)}
                />
                <button type="submit" disabled={!manualId} className="px-6 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 disabled:opacity-50 transition-colors">
                    Go
                </button>
            </form>
        </div>
      )}

      {showScanner && <QrScannerModal onScan={handleScanComplete} onClose={() => setShowScanner(false)} />}

      {/* QR Display Modal */}
      {showQrModal && qrAsset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in duration-200">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-700 overflow-hidden text-center p-6">
                  <div className="mb-4">
                      <h3 className="font-bold text-lg text-slate-800 dark:text-white">{qrAsset.callSign || qrAsset.name}</h3>
                      <p className="text-xs text-slate-500 font-mono mt-1">{qrAsset.id}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl inline-block shadow-inner mb-6 border border-slate-200">
                      <img src={qrUrl} alt="QR Code" className="w-48 h-48" />
                  </div>
                  <div className="flex gap-2">
                      <button onClick={() => setShowQrModal(false)} className="flex-1 py-2 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Close</button>
                      <button onClick={printQr} className="flex-1 py-2 bg-ams-blue text-white font-bold rounded-lg hover:bg-blue-900 flex items-center justify-center gap-2">
                          <Printer className="w-4 h-4" /> Print
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Asset Editor Modal */}
      {showEditor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in duration-200">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700 overflow-hidden max-h-[90vh] flex flex-col">
                  <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                      <h3 className="font-bold text-lg text-slate-800 dark:text-white">{isEditing ? 'Edit Asset' : 'Add New Asset'}</h3>
                      <button onClick={() => setShowEditor(false)}><X className="w-5 h-5 text-slate-400" /></button>
                  </div>
                  <div className="overflow-y-auto flex-1 p-6">
                    <form onSubmit={handleSaveAsset} className="space-y-6">
                        {/* Asset Type Selector (Only on Create) */}
                        {!isEditing && (
                            <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                                <button type="button" onClick={() => setEditorType('Vehicle')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${editorType === 'Vehicle' ? 'bg-white dark:bg-slate-600 shadow text-ams-blue dark:text-white' : 'text-slate-500'}`}>Vehicle</button>
                                <button type="button" onClick={() => setEditorType('Kit')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${editorType === 'Kit' ? 'bg-white dark:bg-slate-600 shadow text-ams-blue dark:text-white' : 'text-slate-500'}`}>Medical Kit</button>
                            </div>
                        )}

                        {/* ID Display */}
                        {isEditing && (
                            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                    <span className="block font-bold uppercase mb-1">System ID</span>
                                    <span className="font-mono">{editorData.id}</span>
                                </div>
                                <button type="button" onClick={() => { navigator.clipboard.writeText(editorData.id); toast.success("ID Copied"); }} className="p-2 text-slate-400 hover:text-ams-blue"><Copy className="w-4 h-4" /></button>
                            </div>
                        )}

                        {editorType === 'Vehicle' ? (
                            <>
                                <div>
                                    <label className="input-label">Call Sign</label>
                                    <input className="input-field" required value={editorData.callSign || ''} onChange={e => setEditorData({...editorData, callSign: e.target.value})} placeholder="e.g. AMB-01" />
                                </div>
                                <div>
                                    <label className="input-label">Registration</label>
                                    <input className="input-field" required value={editorData.registration || ''} onChange={e => setEditorData({...editorData, registration: e.target.value})} placeholder="e.g. AB12 CDE" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="input-label">Vehicle Type</label>
                                        <select className="input-field" value={editorData.type || 'Ambulance'} onChange={e => setEditorData({...editorData, type: e.target.value})}>
                                            <option>Ambulance</option><option>RRV</option><option>4x4</option><option>PTS</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="input-label">Status</label>
                                        <select className="input-field font-bold" value={editorData.status || 'Operational'} onChange={e => setEditorData({...editorData, status: e.target.value})}>
                                            <option value="Operational">Operational</option>
                                            <option value="Maintenance">Maintenance</option>
                                            <option value="Off Road">Off Road</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="input-label">Current Mileage</label>
                                    <input type="number" className="input-field" value={editorData.mileage || ''} onChange={e => setEditorData({...editorData, mileage: Number(e.target.value)})} />
                                </div>
                            </>
                        ) : (
                            <>
                                <div>
                                    <label className="input-label">Kit Name / ID</label>
                                    <input className="input-field" required value={editorData.name || ''} onChange={e => setEditorData({...editorData, name: e.target.value})} placeholder="e.g. Response Bag 4" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="input-label">Kit Type</label>
                                        <select className="input-field" value={editorData.type || 'Response Bag'} onChange={e => setEditorData({...editorData, type: e.target.value})}>
                                            <option>Paramedic Bag</option><option>Response Bag</option><option>Trauma Bag</option><option>Welfare Bag</option><option>Drug Pack</option><option>O2 Bag</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="input-label">Status</label>
                                        <select className="input-field font-bold" value={editorData.status || 'Ready'} onChange={e => setEditorData({...editorData, status: e.target.value})}>
                                            <option value="Ready">Ready</option>
                                            <option value="Restock Needed">Restock Needed</option>
                                            <option value="Quarantined">Quarantined</option>
                                        </select>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Checklist Editor Section */}
                        <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm"><ListPlus className="w-4 h-4" /> Custom Checklist</h4>
                                <button type="button" onClick={resetChecklist} className="text-[10px] flex items-center gap-1 text-slate-500 hover:text-ams-blue"><RefreshCcw className="w-3 h-3" /> Reset Default</button>
                            </div>
                            
                            <div className="space-y-2 mb-4 max-h-40 overflow-y-auto bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                                {editorData.checklist?.map((item: ChecklistItem) => (
                                    <div key={item.id} className="flex justify-between items-center bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                                        <div>
                                            <span className="text-xs font-bold text-slate-800 dark:text-white block">{item.label}</span>
                                            {item.category && <span className="text-[10px] text-slate-400 uppercase">{item.category}</span>}
                                        </div>
                                        <button type="button" onClick={() => removeChecklistItem(item.id)} className="text-red-400 hover:text-red-600"><MinusCircle className="w-4 h-4" /></button>
                                    </div>
                                ))}
                                {(!editorData.checklist || editorData.checklist.length === 0) && <p className="text-center text-xs text-slate-400 italic py-2">No items in checklist.</p>}
                            </div>

                            <div className="flex gap-2">
                                <input 
                                    className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs outline-none dark:text-white"
                                    placeholder="New Item Label"
                                    value={newCheckItemLabel}
                                    onChange={e => setNewCheckItemLabel(e.target.value)}
                                />
                                <input 
                                    className="w-24 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs outline-none dark:text-white"
                                    placeholder="Category"
                                    value={newCheckItemCategory}
                                    onChange={e => setNewCheckItemCategory(e.target.value)}
                                />
                                <button type="button" onClick={addChecklistItem} className="p-2 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-lg hover:bg-green-200"><Plus className="w-4 h-4" /></button>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-4">
                            {isEditing && (
                                <button type="button" onClick={handleDeleteAsset} className="px-4 py-3 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-xl font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            )}
                            <button type="submit" className="flex-1 py-3 bg-ams-blue text-white font-bold rounded-xl hover:bg-blue-900 transition-colors flex items-center justify-center gap-2">
                                <Save className="w-5 h-5" /> {isEditing ? 'Save Changes' : 'Create Asset'}
                            </button>
                        </div>
                    </form>
                  </div>
              </div>
          </div>
      )}

      {/* Checklist Modal */}
      {checkModalOpen && selectedAsset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in duration-200">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-700">
                  <div className="p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
                      <div>
                          <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                              {checkType === 'Vehicle' ? 'Vehicle Inspection' : 'Kit Check'}
                          </h3>
                          <p className="text-xs text-slate-500">{(selectedAsset as any).callSign || (selectedAsset as any).name}</p>
                      </div>
                      <button onClick={() => setCheckModalOpen(false)}><X className="w-6 h-6 text-slate-400" /></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-5 space-y-4">
                      {Object.keys(checklist).map((itemId) => (
                          <label key={itemId} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${checklist[itemId] ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                              <span className={`text-sm font-medium ${checklist[itemId] ? 'text-green-800 dark:text-green-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                  {checkType === 'Vehicle' 
                                    ? (selectedAsset as Vehicle).checklist?.find(i => i.id === itemId)?.label 
                                    : itemId}
                              </span>
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${checklist[itemId] ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 dark:border-slate-500'}`}>
                                  {checklist[itemId] && <CheckCircle className="w-4 h-4" />}
                              </div>
                              <input 
                                  type="checkbox" 
                                  className="hidden" 
                                  checked={checklist[itemId]} 
                                  onChange={e => setChecklist({...checklist, [itemId]: e.target.checked})} 
                              />
                          </label>
                      ))}

                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Faults / Notes</label>
                          <textarea 
                              className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-ams-blue dark:text-white"
                              rows={3}
                              placeholder="Describe any issues found..."
                              value={faults}
                              onChange={e => setFaults(e.target.value)}
                          />
                      </div>
                  </div>

                  <div className="p-5 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                      <button onClick={submitCheck} className="w-full py-3 bg-ams-blue text-white font-bold rounded-xl shadow-lg hover:bg-blue-900 transition-colors">
                          Submit Inspection
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* History Modal */}
      {historyModalId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in duration-200">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh] border border-slate-200 dark:border-slate-700">
                  <div className="p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
                      <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                          <History className="w-5 h-5" /> Check History
                      </h3>
                      <button onClick={() => setHistoryModalId(null)}><X className="w-5 h-5 text-slate-400" /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {historyData.length === 0 && <p className="text-center text-slate-400 text-sm italic py-8">No checks recorded.</p>}
                      {historyData.map(check => (
                          <div key={check.id} className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
                              <div className="flex justify-between items-start mb-2">
                                  <div>
                                      <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(check.timestamp).toLocaleString()}</p>
                                      <p className="text-sm font-bold text-slate-800 dark:text-white">{check.userName}</p>
                                  </div>
                                  <span className={`px-2 py-1 rounded text-xs font-bold ${check.status === 'Pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                      {check.status.toUpperCase()}
                                  </span>
                              </div>
                              {check.faults && check.faults.length > 0 && (
                                  <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900/50">
                                      <p className="text-xs font-bold text-red-800 dark:text-red-300 flex items-center gap-1"><Wrench className="w-3 h-3" /> Faults Reported:</p>
                                      <ul className="list-disc pl-4 text-xs text-red-700 dark:text-red-400 mt-1">
                                          {check.faults.map((f, i) => <li key={i}>{f}</li>)}
                                      </ul>
                                  </div>
                              )}
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default AssetPage;
