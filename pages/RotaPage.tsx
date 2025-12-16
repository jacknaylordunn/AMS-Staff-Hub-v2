
import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, MapPin, Clock, CheckCircle, 
  Calendar as CalendarIcon, Filter, Plus, X, Repeat, Loader2, 
  Briefcase, Truck, Users, Search, Trash2, UserPlus, 
  Sparkles, Save, Edit3, UserCheck, AlertCircle, ArrowRight, Bell,
  Palmtree, AlertOctagon, RefreshCw, MoreHorizontal, UserMinus, Flame, Ban, Copy, CalendarRange, Hand, MousePointerClick, Navigation, DollarSign
} from 'lucide-react';
import { Shift, Role, User, ShiftSlot, Vehicle, MedicalKit, ShiftResource, TimeRecord, Unavailability, ShiftBid } from '../types';
import { useAuth } from '../hooks/useAuth';
import { db } from '../services/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, orderBy, Timestamp, getDocs, writeBatch, limit, startAfter } from 'firebase/firestore';
import { analyzeRotaCoverage } from '../services/geminiService';
import { useToast } from '../context/ToastContext';
import LeafletMap from '../components/LeafletMap';
import { canPerformRole } from '../utils/roleHelper';
import { sendNotification } from '../services/notificationService';

const RotaPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isManager = user?.role === Role.Manager || user?.role === Role.Admin;

  const [viewMode, setViewMode] = useState<'Month' | 'Week' | 'List'>('Month');
  const [filterMode, setFilterMode] = useState<'All' | 'MyShifts' | 'Available'>('All');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [allStaff, setAllStaff] = useState<User[]>([]); 
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [allKits, setAllKits] = useState<MedicalKit[]>([]);
  
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isBriefingOpen, setIsBriefingOpen] = useState(false);
  const [isNewShift, setIsNewShift] = useState(false);
  const [isOperating, setIsOperating] = useState(false);

  const [showMapPicker, setShowMapPicker] = useState(false);
  const [rotaAnalysis, setRotaAnalysis] = useState<string | null>(null);
  const [analyzingRota, setAnalyzingRota] = useState(false);

  const [formData, setFormData] = useState<Partial<Shift>>({});
  const [formSlots, setFormSlots] = useState<ShiftSlot[]>([]);
  const [resourceType, setResourceType] = useState<'Vehicle' | 'Kit'>('Vehicle');
  const [selectedAssetId, setSelectedAssetId] = useState('');
  
  // Address Picker State
  const [showAddressPicker, setShowAddressPicker] = useState(false);

  const [isRepeating, setIsRepeating] = useState(false);
  const [repeatFrequency, setRepeatFrequency] = useState<'Daily' | 'Weekly'>('Weekly');
  const [repeatUntil, setRepeatUntil] = useState('');

  // Unavailability Logic
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [myUnavailability, setMyUnavailability] = useState<Unavailability[]>([]);
  const [allUnavailability, setAllUnavailability] = useState<Unavailability[]>([]); // For Managers
  const [newLeave, setNewLeave] = useState<Partial<Unavailability>>({ type: 'Holiday' });

  const getShiftColor = (shift: Shift) => {
      if (shift.status === 'Cancelled') return 'border-l-slate-500 bg-slate-100/80 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 grayscale opacity-75';
      const now = new Date();
      const endTimePlusOne = new Date(shift.end.getTime() + 60 * 60 * 1000);
      if (now > endTimePlusOne) return 'border-l-slate-400 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 opacity-75 grayscale';
      const isCritical = shift.tags?.includes('Cover Needed') || shift.tags?.includes('Critical');
      if (isCritical) return 'border-l-red-500 bg-red-50/80 dark:bg-red-900/30 text-red-700 dark:text-red-200 animate-pulse';
      const allSlotsFilled = shift.slots && shift.slots.length > 0 && shift.slots.every(s => !!s.userId);
      if (shift.status === 'Filled' || allSlotsFilled) return 'border-l-blue-500 bg-blue-50/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200';
      return 'border-l-emerald-500 bg-emerald-50/80 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-200';
  };

  const getStartOfWeek = (date: Date) => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      monday.setHours(0,0,0,0);
      return monday;
  };

  const getCalendarDays = (date: Date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const firstDayOfMonth = new Date(year, month, 1);
      let startOffset = firstDayOfMonth.getDay() - 1;
      if (startOffset < 0) startOffset = 6;
      const startDate = new Date(firstDayOfMonth);
      startDate.setDate(startDate.getDate() - startOffset);
      startDate.setHours(0,0,0,0);
      const days = [];
      for(let i=0; i<42; i++) {
          const d = new Date(startDate);
          d.setDate(startDate.getDate() + i);
          d.setHours(0,0,0,0);
          days.push(new Date(d));
      }
      return days;
  };

  const isSameDay = (d1: Date, d2: Date) => {
      return d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
  };

  const getShiftsForDay = (date: Date) => {
    return shifts.filter(s => isSameDay(s.start, date));
  };

  // --- Fetch Logic ---
  useEffect(() => {
    setIsLoading(true);
    let q;

    if (viewMode === 'List') {
        // List view shows upcoming 30 days
        const start = new Date();
        start.setHours(0,0,0,0);
        const end = new Date(start);
        end.setDate(end.getDate() + 30);
        q = query(collection(db, 'shifts'), where('start', '>=', Timestamp.fromDate(start)), where('start', '<=', Timestamp.fromDate(end)), orderBy('start', 'asc'));
    } else {
        // Month/Week view based on currentDate
        let startRange = new Date(currentDate);
        let endRange = new Date(currentDate);
        
        if (viewMode === 'Month') {
            const y = currentDate.getFullYear();
            const m = currentDate.getMonth();
            startRange = new Date(y, m, 1);
            startRange.setDate(startRange.getDate() - 7); // Buffer for grid
            endRange = new Date(y, m + 1, 0);
            endRange.setDate(endRange.getDate() + 14); // Buffer for grid
        } else if (viewMode === 'Week') {
            startRange = getStartOfWeek(currentDate);
            endRange = new Date(startRange);
            endRange.setDate(endRange.getDate() + 6);
        }
        startRange.setHours(0,0,0,0);
        endRange.setHours(23,59,59,999);
        q = query(collection(db, 'shifts'), where('start', '>=', Timestamp.fromDate(startRange)), where('start', '<=', Timestamp.fromDate(endRange)), orderBy('start', 'asc'));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedShifts: Shift[] = snapshot.docs.map(doc => {
            const data = doc.data();
            return { id: doc.id, ...data, start: data.start.toDate(), end: data.end.toDate() } as Shift;
        });
        setShifts(fetchedShifts);
        setIsLoading(false);
    });
    return () => unsubscribe();
  }, [currentDate, viewMode]);

  useEffect(() => {
    if (isManager) {
        if (allStaff.length === 0) {
            getDocs(collection(db, 'users')).then(snap => setAllStaff(snap.docs.map(d => ({ uid: d.id, ...d.data() } as User)).filter(u => u.status === 'Active')));
        }
        if (allVehicles.length === 0) {
             getDocs(collection(db, 'fleet')).then(snap => setAllVehicles(snap.docs.map(d => ({ id: d.id, ...d.data() } as Vehicle))));
        }
        if (allKits.length === 0) {
             getDocs(collection(db, 'medical_kits')).then(snap => setAllKits(snap.docs.map(d => ({ id: d.id, ...d.data() } as MedicalKit))));
        }

        const qUn = query(collection(db, 'unavailability'));
        const unsub = onSnapshot(qUn, (snap) => {
            setAllUnavailability(snap.docs.map(d => ({ id: d.id, ...d.data() } as Unavailability)));
        });
        return () => unsub();
    }
  }, [isManager]);

  useEffect(() => {
      if (user) {
          const q = query(collection(db, 'unavailability'), where('userId', '==', user.uid));
          const unsub = onSnapshot(q, (snap) => {
              setMyUnavailability(snap.docs.map(d => ({ id: d.id, ...d.data() } as Unavailability)));
          });
          return () => unsub();
      }
  }, [user]);

  useEffect(() => {
      if (isEditorOpen && selectedShift && !isNewShift) {
          setFormData({ ...selectedShift, start: selectedShift.start, end: selectedShift.end, location: selectedShift.location, address: selectedShift.address || '', notes: selectedShift.notes, status: selectedShift.status, tags: selectedShift.tags || [], resources: selectedShift.resources || [], timeRecords: selectedShift.timeRecords || {} });
          setFormSlots(selectedShift.slots || []);
          setIsRepeating(false); setRepeatUntil(''); setShowAddressPicker(false);
      }
  }, [isEditorOpen, selectedShift, isNewShift]);

  const handleShiftClick = (shift: Shift, e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedShift(shift);
      if (isManager) { 
          setIsNewShift(false); 
          setIsEditorOpen(true); 
      } else { 
          setIsBriefingOpen(true); 
      }
  };

  const handleCreateInit = (date?: Date) => {
      if (!isManager) return;
      const base = date ? new Date(date) : new Date(currentDate);
      base.setHours(7,0,0,0);
      const end = new Date(base);
      end.setHours(19,0,0,0);
      setSelectedShift(null); setIsNewShift(true); setIsRepeating(false); setRepeatUntil(''); setShowAddressPicker(false);
      setFormData({ start: base, end: end, location: '', address: '', notes: '', tags: [], status: 'Open', resources: [] });
      setFormSlots([{ id: `slot_${Date.now()}`, role: Role.Paramedic, bids: [] }]);
      setIsEditorOpen(true);
  };

  const handleSaveShift = async () => {
      if (!formData.start || !formData.end || !formData.location) return;
      try {
          const payload = {
              ...formData,
              slots: formSlots,
              createdBy: user?.uid,
              start: Timestamp.fromDate(formData.start),
              end: Timestamp.fromDate(formData.end)
          };

          if (isNewShift) {
              await addDoc(collection(db, 'shifts'), payload);
          } else if (selectedShift) {
              await updateDoc(doc(db, 'shifts', selectedShift.id), payload);
          }
          setIsEditorOpen(false);
          toast.success("Shift Saved");
      } catch (e) {
          toast.error("Failed to save shift");
          console.error(e);
      }
  };

  const handleCancelShift = async () => {
      if (!selectedShift || !formData.start) return;
      if (!confirm("Are you sure you want to CANCEL this shift? Assigned staff will be notified.")) return;

      try {
          await updateDoc(doc(db, 'shifts', selectedShift.id), { status: 'Cancelled' });
          
          // Notify assigned staff
          const assignedUsers = formSlots.filter(s => s.userId).map(s => s.userId).filter(Boolean) as string[];
          const uniqueUsers = [...new Set(assignedUsers)]; 
          
          const dateStr = formData.start.toLocaleDateString();
          const msg = `Shift at ${formData.location} on ${dateStr} has been CANCELLED. Please check rota.`;

          uniqueUsers.forEach(uid => {
              sendNotification(uid, "Shift Cancelled", msg, "alert");
          });

          setIsEditorOpen(false);
          toast.success("Shift cancelled and staff notified.");
      } catch (e) {
          console.error(e);
          toast.error("Failed to cancel shift");
      }
  };

  const handleDeleteShift = async () => {
      if (!selectedShift) return;
      if (!confirm("Are you sure you want to PERMANENTLY DELETE this shift? This removes it from the rota entirely (e.g. for error correction).")) return;
      
      try {
          await deleteDoc(doc(db, 'shifts', selectedShift.id));
          setIsEditorOpen(false);
          toast.success("Shift deleted");
      } catch (e) {
          toast.error("Failed to delete");
      }
  };

  const updateSlot = (index: number, field: keyof ShiftSlot, val: any) => {
      const newSlots = [...formSlots];
      newSlots[index] = { ...newSlots[index], [field]: val };
      if (field === 'userId') {
          if (val === '') { delete newSlots[index].userId; delete newSlots[index].userName; } 
          else { const staff = allStaff.find(s => s.uid === val); newSlots[index].userName = staff?.name; }
      }
      setFormSlots(newSlots);
  };
  const addSlot = () => setFormSlots([...formSlots, { id: `slot_${Date.now()}`, role: Role.Paramedic, bids: [] }]);
  const removeSlot = (index: number) => setFormSlots(formSlots.filter((_, i) => i !== index));

  const handleAssignBid = (slotIndex: number, bid: ShiftBid) => {
      const newSlots = [...formSlots];
      newSlots[slotIndex] = { 
          ...newSlots[slotIndex], 
          userId: bid.userId, 
          userName: bid.userName,
          bids: [] 
      };
      setFormSlots(newSlots);
      toast.success(`Assigned ${bid.userName}`);
  };

  const handleAddAvailability = async () => {
      if (!user || !newLeave.start || !newLeave.end) return;
      try {
          await addDoc(collection(db, 'unavailability'), {
              userId: user.uid,
              start: newLeave.start,
              end: newLeave.end,
              reason: newLeave.reason || 'Not specified',
              type: newLeave.type || 'Holiday'
          });
          setNewLeave({ type: 'Holiday' });
          toast.success("Unavailability added");
      } catch (e) {
          toast.error("Failed to add");
      }
  };

  const handleDeleteAvailability = async (id: string) => {
      if (!confirm("Remove this entry?")) return;
      try {
          await deleteDoc(doc(db, 'unavailability', id));
          toast.success("Removed");
      } catch (e) {
          toast.error("Failed to remove");
      }
  };

  const isStaffUnavailable = (uid: string, shiftStart?: Date, shiftEnd?: Date) => {
      if (!shiftStart || !shiftEnd) return false;
      const records = allUnavailability.filter(u => u.userId === uid);
      return records.some(r => {
          const start = new Date(r.start);
          const end = new Date(r.end);
          return (shiftStart < end && shiftEnd > start);
      });
  };

  // Helper to extract coordinates for Leaflet map
  const getShiftCoords = (shift: Shift | Partial<Shift>): [number, number] | undefined => {
      if (!shift.address) return undefined;
      const parts = shift.address.split(',').map(s => s.trim());
      if (parts.length >= 2) {
          const lat = parseFloat(parts[0]);
          const lng = parseFloat(parts[1]);
          if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
      }
      return undefined;
  };

  const handleBid = async (slotIndex: number) => {
      if (!selectedShift || !user) return;
      try {
          const newSlots = [...selectedShift.slots];
          const currentBids = newSlots[slotIndex].bids || [];
          
          if (currentBids.some(b => b.userId === user.uid)) return;

          newSlots[slotIndex].bids = [...currentBids, {
              userId: user.uid,
              userName: user.name,
              userRole: user.role,
              timestamp: new Date().toISOString()
          }];

          await updateDoc(doc(db, 'shifts', selectedShift.id), {
              slots: newSlots
          });
          
          // Optimistic update for UI feel
          setSelectedShift({ ...selectedShift, slots: newSlots });
          toast.success("Bid submitted successfully");
      } catch (e) {
          toast.error("Failed to submit bid");
      }
  };

  const handleAddResource = () => {
      if (!selectedAssetId) return;
      let newResource: ShiftResource | null = null;

      if (resourceType === 'Vehicle') {
          const v = allVehicles.find(x => x.id === selectedAssetId);
          if (v) newResource = { id: v.id, type: 'Vehicle', name: v.callSign };
      } else {
          const k = allKits.find(x => x.id === selectedAssetId);
          if (k) newResource = { id: k.id, type: 'Kit', name: k.name };
      }

      if (newResource) {
          const current = formData.resources || [];
          if (!current.some(r => r.id === newResource!.id)) {
              setFormData({ ...formData, resources: [...current, newResource] });
          }
      }
      setSelectedAssetId('');
  };

  const handleRemoveResource = (id: string) => {
      const current = formData.resources || [];
      setFormData({ ...formData, resources: current.filter(r => r.id !== id) });
  };

  const handleAddressSelect = (lat: number, lng: number, address?: string) => {
      const formatted = `${lat.toFixed(6)}, ${lng.toFixed(6)} | ${address || 'Selected Location'}`;
      setFormData({ ...formData, address: formatted });
      setShowAddressPicker(false);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-4">
              <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
                  <button onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth()-1); setCurrentDate(d); }} className="p-2 hover:bg-white dark:hover:bg-slate-600 rounded-lg transition-colors"><ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" /></button>
                  <button onClick={() => setCurrentDate(new Date())} className="px-4 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-ams-blue transition-colors">Today</button>
                  <button onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth()+1); setCurrentDate(d); }} className="p-2 hover:bg-white dark:hover:bg-slate-600 rounded-lg transition-colors"><ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-300" /></button>
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <CalendarIcon className="w-6 h-6 text-ams-blue" />
                  {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h2>
          </div>

          <div className="flex flex-wrap gap-2">
              <button onClick={() => setShowAvailabilityModal(true)} className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-white rounded-xl font-bold text-sm shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2">
                  <Palmtree className="w-4 h-4" /> My Availability
              </button>
              <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
                  {['Month', 'Week', 'List'].map(m => (
                      <button key={m} onClick={() => setViewMode(m as any)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === m ? 'bg-white dark:bg-slate-600 shadow text-ams-blue dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>{m}</button>
                  ))}
              </div>
              
              {isManager && (
                  <button onClick={() => handleCreateInit()} className="px-4 py-2 bg-ams-blue text-white rounded-xl font-bold text-sm shadow-md hover:bg-blue-700 transition-all flex items-center gap-2">
                      <Plus className="w-4 h-4" /> New Shift
                  </button>
              )}
          </div>
      </div>

      {isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-ams-blue" /></div>
      ) : (
          <>
            {viewMode === 'Month' && (
                <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-700 rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                        <div key={day} className="bg-slate-50 dark:bg-slate-800 p-2 text-center text-xs font-bold text-slate-500 uppercase">
                            {day}
                        </div>
                    ))}
                    {getCalendarDays(currentDate).map((day, idx) => {
                        const dayShifts = getShiftsForDay(day);
                        const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                        const isToday = isSameDay(day, new Date());
                        
                        return (
                            <div 
                                key={idx} 
                                onClick={() => isManager && handleCreateInit(day)}
                                className={`min-h-[100px] bg-white dark:bg-slate-900 p-2 relative group transition-colors ${!isCurrentMonth ? 'bg-slate-50/50 dark:bg-slate-800/50' : 'hover:bg-blue-50 dark:hover:bg-slate-800'}`}
                            >
                                <div className={`text-xs font-bold mb-2 flex justify-between ${isToday ? 'text-ams-blue' : 'text-slate-700 dark:text-slate-300'} ${!isCurrentMonth ? 'opacity-50' : ''}`}>
                                    <span className={isToday ? 'bg-ams-blue text-white px-1.5 rounded-full' : ''}>{day.getDate()}</span>
                                    {isManager && <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 cursor-pointer text-slate-400 hover:text-ams-blue" />}
                                </div>
                                <div className="space-y-1">
                                    {dayShifts.map(shift => (
                                        <div 
                                            key={shift.id}
                                            onClick={(e) => handleShiftClick(shift, e)}
                                            className={`text-[10px] p-1.5 rounded border-l-2 cursor-pointer truncate shadow-sm transition-all hover:scale-[1.02] ${getShiftColor(shift)}`}
                                        >
                                            <div className="font-bold truncate">{shift.location}</div>
                                            <div className="opacity-80">{shift.start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {viewMode === 'Week' && (
                <div className="grid grid-cols-7 gap-2 h-[calc(100vh-240px)] overflow-y-auto">
                    {Array.from({ length: 7 }).map((_, i) => {
                        const day = new Date(getStartOfWeek(currentDate));
                        day.setDate(day.getDate() + i);
                        const dayShifts = getShiftsForDay(day);
                        const isToday = isSameDay(day, new Date());

                        return (
                            <div key={i} className="flex flex-col gap-2">
                                <div className={`text-center p-2 rounded-xl border ${isToday ? 'bg-ams-blue text-white border-ams-blue' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                                    <div className="text-xs font-bold uppercase opacity-70">{day.toLocaleDateString('en-GB', { weekday: 'short' })}</div>
                                    <div className="text-lg font-bold">{day.getDate()}</div>
                                </div>
                                <div className="flex-1 space-y-2 p-1 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                                    {dayShifts.map(shift => (
                                        <div 
                                            key={shift.id}
                                            onClick={(e) => handleShiftClick(shift, e)}
                                            className={`p-2 rounded-lg border-l-4 cursor-pointer shadow-sm ${getShiftColor(shift)}`}
                                        >
                                            <div className="font-bold text-xs">{shift.location}</div>
                                            <div className="text-[10px] mt-1 flex items-center gap-1 opacity-90">
                                                <Clock className="w-3 h-3" />
                                                {shift.start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - {shift.end.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                            </div>
                                            <div className="mt-2 flex -space-x-1">
                                                {shift.slots.map((slot, idx) => (
                                                    <div key={idx} className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white ring-1 ring-white dark:ring-slate-900 ${slot.userId ? 'bg-green-500' : 'bg-slate-300'}`} title={slot.userName || 'Open'}>
                                                        {slot.userName ? slot.userName.charAt(0) : '?'}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    {isManager && (
                                        <button onClick={() => handleCreateInit(day)} className="w-full py-2 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg text-slate-400 hover:text-ams-blue hover:border-ams-blue transition-colors flex items-center justify-center">
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {viewMode === 'List' && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    {shifts.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">No shifts found for this period.</div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                            {shifts.map(shift => (
                                <div key={shift.id} onClick={(e) => handleShiftClick(shift, e)} className="p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-xl ${getShiftColor(shift).replace('border-l-', 'border-l-4 ')}`}>
                                            <CalendarIcon className="w-5 h-5 opacity-70" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 dark:text-white group-hover:text-ams-blue transition-colors">{shift.location}</h4>
                                            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-1">
                                                <span className="font-bold text-slate-600 dark:text-slate-300">{shift.start.toLocaleDateString()}</span>
                                                <span>•</span>
                                                <span>{shift.start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - {shift.end.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-3 md:mt-0 flex items-center gap-4">
                                        <div className="flex -space-x-2">
                                            {shift.slots.map((slot, idx) => (
                                                <div key={idx} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ring-2 ring-white dark:ring-slate-800 ${slot.userId ? 'bg-green-500' : 'bg-slate-300'}`} title={slot.role}>
                                                    {slot.userName ? slot.userName.charAt(0) : '?'}
                                                </div>
                                            ))}
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-ams-blue" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
          </>
      )}

      {/* Shift Briefing Modal (Staff View) */}
      {isBriefingOpen && selectedShift && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in duration-200">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
                  {/* Header */}
                  <div className="p-6 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex justify-between items-start">
                      <div>
                          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{selectedShift.location}</h2>
                          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mt-1 font-medium text-sm">
                              <CalendarIcon className="w-4 h-4" />
                              {selectedShift.start.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
                              <Clock className="w-4 h-4 ml-2" />
                              {selectedShift.start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - {selectedShift.end.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                          </div>
                      </div>
                      <button onClick={() => setIsBriefingOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
                          <X className="w-6 h-6 text-slate-400" />
                      </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      {/* Map Section */}
                      <div className="h-48 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 relative bg-slate-100 dark:bg-slate-900">
                           <LeafletMap 
                                height="100%" 
                                center={getShiftCoords(selectedShift) || [51.505, -0.09]} 
                                zoom={13}
                                markers={getShiftCoords(selectedShift) ? [{ id: 'shift-loc', lat: getShiftCoords(selectedShift)![0], lng: getShiftCoords(selectedShift)![1], label: selectedShift.location }] : []}
                           />
                           <div className="absolute bottom-2 right-2 flex gap-2 z-[400]">
                              <a 
                                  href={`https://www.google.com/maps/search/?api=1&query=${
                                      getShiftCoords(selectedShift) 
                                      ? `${getShiftCoords(selectedShift)![0]},${getShiftCoords(selectedShift)![1]}` 
                                      : encodeURIComponent(selectedShift.address || selectedShift.location)
                                  }`} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="bg-white dark:bg-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors dark:text-white"
                              >
                                  <Navigation className="w-3 h-3" /> Open Maps
                              </a>
                           </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Team Section */}
                          <div>
                              <h3 className="font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                                  <Users className="w-5 h-5 text-ams-blue" /> Team Roster
                              </h3>
                              <div className="space-y-2">
                                  {selectedShift.slots.map((slot, idx) => {
                                      const isMe = slot.userId === user?.uid;
                                      const isEmpty = !slot.userId;
                                      const hasBid = slot.bids?.some(b => b.userId === user?.uid);
                                      const canBid = isEmpty && !hasBid && user && canPerformRole(user.role, slot.role);

                                      return (
                                          <div key={idx} className={`flex items-center gap-3 p-3 rounded-xl border ${isMe ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'}`}>
                                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 ${slot.userId ? 'bg-ams-blue' : 'bg-slate-300 dark:bg-slate-700'}`}>
                                                  {slot.userName ? slot.userName.charAt(0) : '?'}
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                  <div className="font-bold text-sm text-slate-800 dark:text-white truncate">
                                                      {slot.userName || 'Open Slot'} 
                                                      {isMe && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-1.5 py-0.5 rounded-full">YOU</span>}
                                                  </div>
                                                  <div className="text-xs text-slate-500">{slot.role}</div>
                                              </div>
                                              {canBid && (
                                                  <button 
                                                      onClick={() => handleBid(idx)}
                                                      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-colors"
                                                  >
                                                      Bid
                                                  </button>
                                              )}
                                              {hasBid && isEmpty && (
                                                  <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded">Pending</span>
                                              )}
                                          </div>
                                      );
                                  })}
                              </div>
                          </div>

                          {/* Assets Section */}
                          <div>
                              <h3 className="font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                                  <Truck className="w-5 h-5 text-green-600" /> Assets & Resources
                              </h3>
                              {selectedShift.resources && selectedShift.resources.length > 0 ? (
                                  <div className="space-y-2">
                                      {selectedShift.resources.map((res, i) => (
                                          <div key={i} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
                                              <div className={`p-2 rounded-lg ${res.type === 'Vehicle' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'}`}>
                                                  {res.type === 'Vehicle' ? <Truck className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
                                              </div>
                                              <div className="font-bold text-sm text-slate-800 dark:text-white">{res.name}</div>
                                          </div>
                                      ))}
                                  </div>
                              ) : (
                                  <div className="p-4 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-center text-slate-400 text-sm">
                                      No specific assets assigned yet.
                                  </div>
                              )}
                              
                              {/* Address Details if text */}
                              {selectedShift.address && (
                                  <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-1">Address / Instructions</h4>
                                      <p className="text-sm text-slate-700 dark:text-slate-300">{selectedShift.address}</p>
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>
                  
                  {/* Footer */}
                  <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                      <button onClick={() => setIsBriefingOpen(false)} className="px-6 py-2 bg-slate-800 dark:bg-slate-700 text-white font-bold rounded-xl hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors">
                          Close Briefing
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Shift Editor (Manager) */}
      {isEditorOpen && formData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in duration-200">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700">
                  <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                      <h3 className="font-bold text-lg text-slate-800 dark:text-white">{isNewShift ? 'Create Shift' : 'Edit Shift'}</h3>
                      <button onClick={() => setIsEditorOpen(false)}><X className="w-6 h-6 text-slate-400" /></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Left: Details */}
                          <div className="space-y-4">
                              <div>
                                  <label className="text-xs font-bold text-slate-500 uppercase">Shift Name / Title</label>
                                  <input 
                                    className="w-full p-2 border rounded-lg bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white" 
                                    value={formData.location || ''} 
                                    onChange={e => setFormData({...formData, location: e.target.value})} 
                                    placeholder="e.g. Night Shift - Alpha"
                                  />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Location / Address</label>
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <input 
                                            className="w-full p-2 border rounded-lg bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white" 
                                            value={formData.address || ''} 
                                            onChange={e => setFormData({...formData, address: e.target.value})} 
                                            placeholder="Lat, Lng | Address (or type manually)"
                                        />
                                        <button 
                                            onClick={() => setShowAddressPicker(!showAddressPicker)}
                                            className={`px-3 py-2 rounded-lg border flex items-center gap-2 transition-colors ${showAddressPicker ? 'bg-ams-blue text-white border-ams-blue' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-600 hover:bg-slate-200'}`}
                                            title="Select on Map"
                                        >
                                            <MapPin className="w-4 h-4" />
                                            <span className="hidden sm:inline text-xs font-bold">Map</span>
                                        </button>
                                    </div>
                                    
                                    {showAddressPicker && (
                                        <div className="h-64 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner relative animate-in slide-in-from-top-2">
                                            <LeafletMap 
                                                interactive 
                                                showSearch 
                                                onLocationSelect={handleAddressSelect}
                                                height="100%"
                                                center={getShiftCoords(formData as Shift) || [51.505, -0.09]} 
                                                zoom={13}
                                                markers={getShiftCoords(formData as Shift) ? [{
                                                    id: 'current',
                                                    lat: getShiftCoords(formData as Shift)![0],
                                                    lng: getShiftCoords(formData as Shift)![1],
                                                    color: '#0052CC'
                                                }] : []}
                                            />
                                            <div className="absolute bottom-2 left-2 right-2 bg-white/90 dark:bg-slate-900/90 p-2 text-xs text-center rounded-lg backdrop-blur-sm z-[400] pointer-events-none">
                                                Search or tap on map to select precise location.
                                            </div>
                                        </div>
                                    )}
                                    <p className="text-[10px] text-slate-400">
                                        Format: "Lat, Lng | Address". This ensures GPS clock-in verification works correctly.
                                    </p>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                  <div>
                                      <label className="text-xs font-bold text-slate-500 uppercase">Start</label>
                                      <input 
                                        type="datetime-local" 
                                        className="w-full p-2 border rounded-lg bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white" 
                                        value={formData.start ? new Date(formData.start.getTime() - (formData.start.getTimezoneOffset() * 60000)).toISOString().slice(0,16) : ''} 
                                        onChange={e => setFormData({...formData, start: new Date(e.target.value)})} 
                                      />
                                  </div>
                                  <div>
                                      <label className="text-xs font-bold text-slate-500 uppercase">End</label>
                                      <input 
                                        type="datetime-local" 
                                        className="w-full p-2 border rounded-lg bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white" 
                                        value={formData.end ? new Date(formData.end.getTime() - (formData.end.getTimezoneOffset() * 60000)).toISOString().slice(0,16) : ''} 
                                        onChange={e => setFormData({...formData, end: new Date(e.target.value)})} 
                                      />
                                  </div>
                              </div>

                              {/* Asset Assignment Section */}
                              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                                  <h4 className="font-bold text-sm text-slate-700 dark:text-white mb-2">Assign Assets</h4>
                                  <div className="flex gap-2 mb-2">
                                      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                                          <button onClick={() => setResourceType('Vehicle')} className={`px-3 py-1 text-xs font-bold rounded-md ${resourceType === 'Vehicle' ? 'bg-white dark:bg-slate-600 shadow text-ams-blue' : 'text-slate-500'}`}>Vehicle</button>
                                          <button onClick={() => setResourceType('Kit')} className={`px-3 py-1 text-xs font-bold rounded-md ${resourceType === 'Kit' ? 'bg-white dark:bg-slate-600 shadow text-ams-blue' : 'text-slate-500'}`}>Kit</button>
                                      </div>
                                      <select 
                                          className="flex-1 p-1.5 text-xs border rounded-lg bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                                          value={selectedAssetId}
                                          onChange={e => setSelectedAssetId(e.target.value)}
                                      >
                                          <option value="">-- Select --</option>
                                          {resourceType === 'Vehicle' 
                                              ? allVehicles.map(v => <option key={v.id} value={v.id}>{v.callSign} ({v.type})</option>)
                                              : allKits.map(k => <option key={k.id} value={k.id}>{k.name} ({k.type})</option>)
                                          }
                                      </select>
                                      <button onClick={handleAddResource} className="px-3 py-1 bg-ams-blue text-white rounded-lg text-xs font-bold hover:bg-blue-700">Add</button>
                                  </div>
                                  
                                  <div className="space-y-1 max-h-32 overflow-y-auto">
                                      {formData.resources?.map(res => (
                                          <div key={res.id} className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                                              <div className="flex items-center gap-2">
                                                  {res.type === 'Vehicle' ? <Truck className="w-3 h-3 text-green-600" /> : <Briefcase className="w-3 h-3 text-orange-500" />}
                                                  <span className="text-xs font-bold text-slate-900 dark:text-white">{res.name}</span>
                                              </div>
                                              <button onClick={() => handleRemoveResource(res.id)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-1 rounded"><Trash2 className="w-3 h-3" /></button>
                                          </div>
                                      ))}
                                      {(!formData.resources || formData.resources.length === 0) && (
                                          <p className="text-xs text-slate-400 italic text-center py-2">No assets assigned.</p>
                                      )}
                                  </div>
                              </div>
                          </div>

                          {/* Right: Slots with Unavailability Check */}
                          <div className="space-y-6">
                              <div>
                                  <div className="flex justify-between items-center mb-2"><h4 className="font-bold text-sm text-slate-700 dark:text-white">Staffing Slots</h4><button onClick={addSlot} className="text-xs bg-ams-blue text-white px-2 py-1 rounded">+ Add Slot</button></div>
                                  <div className="space-y-2 max-h-60 overflow-y-auto">
                                      {formSlots.map((slot, idx) => (
                                          <div key={idx} className="p-3 border rounded-lg bg-slate-50 dark:bg-slate-900 dark:border-slate-700">
                                              <div className="flex justify-between mb-2">
                                                  <select className="text-xs p-1 rounded border bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white" value={slot.role} onChange={e => updateSlot(idx, 'role', e.target.value)}>{Object.values(Role).map(r => <option key={r}>{r}</option>)}</select>
                                                  <button onClick={() => removeSlot(idx)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                                              </div>
                                              <select className="w-full text-xs p-2 rounded border bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white mb-2" value={slot.userId || ''} onChange={e => updateSlot(idx, 'userId', e.target.value)}>
                                                  <option value="">-- Unassigned --</option>
                                                  {allStaff.map(s => {
                                                      const isUnavailable = isStaffUnavailable(s.uid, formData.start, formData.end);
                                                      return (
                                                          <option key={s.uid} value={s.uid} disabled={isUnavailable} className={isUnavailable ? 'text-red-400' : ''}>
                                                              {s.name} {isUnavailable ? '(Unavailable)' : `(${s.role})`}
                                                          </option>
                                                      );
                                                  })}
                                              </select>
                                              
                                              {/* Bids Section */}
                                              {slot.bids && slot.bids.length > 0 && !slot.userId && (
                                                  <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-1">
                                                      <div className="text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                                                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                                                          {slot.bids.length} Pending Bids
                                                      </div>
                                                      <div className="space-y-1.5">
                                                          {slot.bids.map((bid, bIdx) => (
                                                              <div key={bIdx} className="flex justify-between items-center bg-white dark:bg-slate-800 p-2 rounded-md border border-slate-200 dark:border-slate-700 shadow-sm">
                                                                  <div>
                                                                      <span className="font-bold text-xs text-slate-800 dark:text-white block">{bid.userName}</span>
                                                                      <span className="text-[10px] text-slate-500">{new Date(bid.timestamp).toLocaleDateString(undefined, {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</span>
                                                                  </div>
                                                                  <button 
                                                                      onClick={() => handleAssignBid(idx, bid)}
                                                                      className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] font-bold rounded hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                                                                  >
                                                                      Assign
                                                                  </button>
                                                              </div>
                                                          ))}
                                                      </div>
                                                  </div>
                                              )}
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
                  {/* ... Footer ... */}
                  <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
                      <div className="flex gap-2">
                          {!isNewShift && (
                              <>
                                  <button 
                                      onClick={handleDeleteShift} 
                                      className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                                      title="Permanently Delete (Error Correction)"
                                  >
                                      <Trash2 className="w-4 h-4" />
                                  </button>
                                  {formData.status !== 'Cancelled' && (
                                      <button 
                                          onClick={handleCancelShift} 
                                          className="px-4 py-2 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 rounded-lg text-sm font-bold flex items-center gap-2"
                                          title="Cancel Shift and Notify Staff"
                                      >
                                          <Ban className="w-4 h-4" /> Cancel Shift
                                      </button>
                                  )}
                              </>
                          )}
                      </div>
                      <div className="flex gap-2">
                          <button onClick={() => setIsEditorOpen(false)} className="px-6 py-2 text-slate-500 font-bold hover:bg-slate-200 rounded-lg">Close</button>
                          <button onClick={handleSaveShift} className="px-8 py-2 bg-ams-blue text-white font-bold rounded-lg hover:bg-blue-700">Save</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Availability Modal */}
      {showAvailabilityModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in duration-200">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                          <Palmtree className="w-5 h-5 text-ams-blue" /> Manage Unavailability
                      </h3>
                      <button onClick={() => setShowAvailabilityModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
                  </div>
                  
                  <div className="space-y-4 mb-6">
                      <div className="grid grid-cols-2 gap-2">
                          <input type="date" className="p-2 border rounded-lg bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white" value={newLeave.start || ''} onChange={e => setNewLeave({...newLeave, start: e.target.value})} />
                          <input type="date" className="p-2 border rounded-lg bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white" value={newLeave.end || ''} onChange={e => setNewLeave({...newLeave, end: e.target.value})} />
                      </div>
                      <select className="w-full p-2 border rounded-lg bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white" value={newLeave.type} onChange={e => setNewLeave({...newLeave, type: e.target.value as any})}>
                          <option>Holiday</option><option>Sick</option><option>Other</option>
                      </select>
                      <input className="w-full p-2 border rounded-lg bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white" placeholder="Reason (Optional)" value={newLeave.reason || ''} onChange={e => setNewLeave({...newLeave, reason: e.target.value})} />
                      <button onClick={handleAddAvailability} className="w-full py-2 bg-ams-blue text-white rounded-lg font-bold">Add Unavailability</button>
                  </div>

                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Upcoming Leave</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                      {myUnavailability.map(leave => (
                          <div key={leave.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                              <div>
                                  <div className="font-bold text-sm text-slate-800 dark:text-white">{leave.type}</div>
                                  <div className="text-xs text-slate-500">{new Date(leave.start).toLocaleDateString()} - {new Date(leave.end).toLocaleDateString()}</div>
                              </div>
                              <button onClick={() => handleDeleteAvailability(leave.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 className="w-4 h-4" /></button>
                          </div>
                      ))}
                      {myUnavailability.length === 0 && <p className="text-center text-slate-400 text-xs py-4">No upcoming leave recorded.</p>}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default RotaPage;
