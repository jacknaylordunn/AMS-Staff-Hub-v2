
import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, MapPin, Clock, CheckCircle, 
  Calendar as CalendarIcon, Filter, Plus, X, Repeat, Loader2, 
  Briefcase, Truck, Users, Search, Trash2, UserPlus, 
  Sparkles, Save, Edit3, UserCheck, AlertCircle, ArrowRight, Bell,
  Palmtree, AlertOctagon, RefreshCw, MoreHorizontal, UserMinus, Flame, Ban, Copy, CalendarRange, Hand, MousePointerClick, Navigation, DollarSign
} from 'lucide-react';
import { Shift, Role, User, ShiftSlot, Vehicle, MedicalKit, ShiftResource, TimeRecord } from '../types';
import { useAuth } from '../hooks/useAuth';
import { db } from '../services/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, orderBy, Timestamp, getDocs, writeBatch, limit, startAfter } from 'firebase/firestore';
import { sendNotification } from '../services/notificationService';
import { analyzeRotaCoverage } from '../services/geminiService';

const RotaPage = () => {
  const { user } = useAuth();
  const isManager = user?.role === Role.Manager || user?.role === Role.Admin;

  // View State
  const [viewMode, setViewMode] = useState<'Month' | 'Week' | 'List'>('Month');
  const [filterMode, setFilterMode] = useState<'All' | 'MyShifts' | 'Available'>('All');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // List Pagination
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Manager Data (Staff & Assets)
  const [allStaff, setAllStaff] = useState<User[]>([]); 
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [allKits, setAllKits] = useState<MedicalKit[]>([]);
  
  // Modal State
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false); // For Managers
  const [isBriefingOpen, setIsBriefingOpen] = useState(false); // For Staff
  const [isNewShift, setIsNewShift] = useState(false);
  const [isOperating, setIsOperating] = useState(false);

  // Time Manager Modal
  const [manageTimeUser, setManageTimeUser] = useState<{uid: string, name: string} | null>(null);
  const [manageTimeData, setManageTimeData] = useState<{in: string, out: string}>({in: '', out: ''});

  // AI Rota Analysis
  const [rotaAnalysis, setRotaAnalysis] = useState<string | null>(null);
  const [analyzingRota, setAnalyzingRota] = useState(false);

  // Editor Form State
  const [formData, setFormData] = useState<Partial<Shift>>({});
  const [formSlots, setFormSlots] = useState<ShiftSlot[]>([]);
  
  // Resource Selection State (Editor)
  const [resourceType, setResourceType] = useState<'Vehicle' | 'Kit'>('Vehicle');
  const [selectedAssetId, setSelectedAssetId] = useState('');

  // Repeat & Duplicate State
  const [isRepeating, setIsRepeating] = useState(false);
  const [repeatFrequency, setRepeatFrequency] = useState<'Daily' | 'Weekly'>('Weekly');
  const [repeatUntil, setRepeatUntil] = useState('');

  // --- Helper: Intelligent Color Tagging ---
  const getShiftColor = (shift: Shift) => {
      if (shift.status === 'Cancelled') {
          return 'border-l-slate-500 bg-slate-100/80 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400';
      }
      
      const now = new Date();
      const start = shift.start;
      const hoursUntil = (start.getTime() - now.getTime()) / (1000 * 60 * 60);
      const hasEmptySlots = shift.slots && shift.slots.some(s => !s.userId);
      
      const isCritical = shift.tags?.includes('Cover Needed') || shift.tags?.includes('Critical') || (hoursUntil < 24 && hoursUntil > 0 && hasEmptySlots);

      if (isCritical) {
          return 'border-l-red-500 bg-red-50/80 dark:bg-red-900/30 text-red-700 dark:text-red-200 animate-pulse';
      }

      const allSlotsFilled = shift.slots && shift.slots.length > 0 && shift.slots.every(s => !!s.userId);
      if (shift.status === 'Filled' || allSlotsFilled) {
          return 'border-l-blue-500 bg-blue-50/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200';
      }

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

  const fetchListShifts = async (isInitial = true) => {
      if (isInitial) setIsLoading(true);
      else setLoadingMore(true);

      try {
          const now = new Date();
          now.setHours(0,0,0,0);
          
          let q = query(
              collection(db, 'shifts'),
              where('start', '>=', Timestamp.fromDate(now)),
              orderBy('start', 'asc'),
              limit(20)
          );

          if (!isInitial && lastDoc) {
              q = query(
                  collection(db, 'shifts'),
                  where('start', '>=', Timestamp.fromDate(now)),
                  orderBy('start', 'asc'),
                  startAfter(lastDoc),
                  limit(20)
              );
          }

          const snapshot = await getDocs(q);
          const fetchedShifts: Shift[] = snapshot.docs.map(doc => {
              const data = doc.data();
              return { id: doc.id, ...data, start: data.start.toDate(), end: data.end.toDate() } as Shift;
          });

          if (snapshot.docs.length < 20) setHasMore(false);
          setLastDoc(snapshot.docs[snapshot.docs.length - 1]);

          setShifts(prev => isInitial ? fetchedShifts : [...prev, ...fetchedShifts]);
      } catch (e) {
          console.error("List fetch error", e);
      } finally {
          setIsLoading(false);
          setLoadingMore(false);
      }
  };

  useEffect(() => {
    if (viewMode === 'List') {
        fetchListShifts(true);
        return;
    }

    // Standard Grid Logic
    let startRange = new Date(currentDate);
    let endRange = new Date(currentDate);

    if (viewMode === 'Month') {
        const y = currentDate.getFullYear();
        const m = currentDate.getMonth();
        startRange = new Date(y, m, 1);
        startRange.setDate(startRange.getDate() - 7);
        endRange = new Date(y, m + 1, 0);
        endRange.setDate(endRange.getDate() + 14);
    } else if (viewMode === 'Week') {
        startRange = getStartOfWeek(currentDate);
        endRange = new Date(startRange);
        endRange.setDate(endRange.getDate() + 6);
    }
    
    startRange.setHours(0,0,0,0);
    endRange.setHours(23,59,59,999);

    const q = query(
        collection(db, 'shifts'),
        where('start', '>=', Timestamp.fromDate(startRange)),
        where('start', '<=', Timestamp.fromDate(endRange)),
        orderBy('start', 'asc')
    );

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

  // Load Manager Data Once
  useEffect(() => {
    if (isManager && allStaff.length === 0) {
        getDocs(collection(db, 'users')).then(snap => setAllStaff(snap.docs.map(d => ({ uid: d.id, ...d.data() } as User)).filter(u => u.status === 'Active')));
        getDocs(collection(db, 'fleet')).then(snap => setAllVehicles(snap.docs.map(d => ({ id: d.id, ...d.data() } as Vehicle))));
        getDocs(collection(db, 'medical_kits')).then(snap => setAllKits(snap.docs.map(d => ({ id: d.id, ...d.data() } as MedicalKit))));
    }
  }, [isManager]);

  // --- Real-time Sync for Staff Modal ---
  useEffect(() => {
      if (selectedShift && !isEditorOpen && viewMode !== 'List') {
          const freshData = shifts.find(s => s.id === selectedShift.id);
          if (freshData) setSelectedShift(freshData);
      }
  }, [shifts, isEditorOpen]);

  // --- Form Synchronization Effect ---
  useEffect(() => {
      if (isEditorOpen && selectedShift && !isNewShift) {
          setFormData({
              ...selectedShift,
              start: selectedShift.start,
              end: selectedShift.end,
              location: selectedShift.location,
              address: selectedShift.address || '',
              notes: selectedShift.notes,
              status: selectedShift.status,
              tags: selectedShift.tags || [],
              resources: selectedShift.resources || [],
              timeRecords: selectedShift.timeRecords || {}
          });
          setFormSlots(selectedShift.slots || []);
          setIsRepeating(false);
          setRepeatUntil('');
      }
  }, [isEditorOpen, selectedShift, isNewShift]);

  const getVisibleShifts = () => {
      return shifts.filter(s => {
          if (filterMode === 'MyShifts') return s.slots?.some(slot => slot.userId === user?.uid);
          if (filterMode === 'Available') {
              const hasEmptySlot = s.slots?.some(slot => !slot.userId);
              const isFuture = s.start > new Date();
              const notCancelled = s.status !== 'Cancelled';
              return hasEmptySlot && isFuture && notCancelled;
          }
          return true;
      });
  };

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

      setSelectedShift(null);
      setIsNewShift(true);
      setIsRepeating(false);
      setRepeatUntil('');
      
      setFormData({
          start: base,
          end: end,
          location: '',
          address: '',
          notes: '',
          tags: [],
          status: 'Open',
          resources: []
      });
      setFormSlots([{ id: `slot_${Date.now()}`, role: Role.Paramedic, bids: [] }]);
      setIsEditorOpen(true);
  };

  const handleDuplicate = () => {
      setIsNewShift(true);
      setSelectedShift(null);
      setIsRepeating(false);
      const cleanSlots = formSlots.map(s => {
          const copy = { ...s, bids: [] };
          delete copy.userId;
          delete copy.userName;
          return copy;
      });
      setFormSlots(cleanSlots);
      alert("Shift Duplicated. Please review Date/Time and Save.");
  };

  const useCurrentLocation = () => {
      if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
              (position) => {
                  const coords = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
                  setFormData(prev => ({...prev, address: coords }));
              },
              () => { alert("Unable to get location"); }
          );
      }
  };

  const sanitizeSlots = (slots: ShiftSlot[]) => {
      return slots.map(slot => {
          const clean = { ...slot };
          if (clean.userId === undefined) delete clean.userId;
          if (clean.userName === undefined) delete clean.userName;
          if (!clean.bids) clean.bids = [];
          return clean;
      });
  };

  const handleSaveShift = async () => {
      if (!formData.start || !formData.end || !formData.location) {
          alert("Please fill in Start, End and Shift Name.");
          return;
      }
      
      let finalStatus = formData.status || 'Open';
      if (finalStatus !== 'Cancelled') {
          const allFilled = formSlots.length > 0 && formSlots.every(s => !!s.userId);
          finalStatus = allFilled ? 'Filled' : 'Open';
      }

      const sanitizedSlots = sanitizeSlots(formSlots);

      const basePayload = {
          start: Timestamp.fromDate(formData.start),
          end: Timestamp.fromDate(formData.end),
          location: formData.location, // Shift Name
          address: formData.address || '', // Physical Address
          notes: formData.notes || '',
          slots: sanitizedSlots,
          status: finalStatus,
          tags: formData.tags || [],
          resources: formData.resources || [],
          createdBy: user?.uid || null, 
          timeRecords: formData.timeRecords || {}
      };

      setIsOperating(true);
      try {
          const batch = writeBatch(db);
          const mainRef = isNewShift ? doc(collection(db, 'shifts')) : doc(db, 'shifts', selectedShift!.id);
          if (isNewShift) {
              batch.set(mainRef, basePayload);
          } else {
              batch.update(mainRef, basePayload);
          }

          if (!isNewShift && selectedShift) {
              sanitizedSlots.forEach(newSlot => {
                  const oldSlot = selectedShift.slots?.find(s => s.id === newSlot.id);
                  if (newSlot.userId && (!oldSlot || oldSlot.userId !== newSlot.userId)) {
                      sendNotification(newSlot.userId, "Shift Assignment", `Assigned to ${formData.location} on ${formData.start?.toLocaleDateString()}.`, "success", "/rota");
                  }
              });
          }

          if (isRepeating && repeatUntil) {
              const untilDate = new Date(repeatUntil);
              untilDate.setHours(23, 59, 59);
              let nextStart = new Date(formData.start);
              let nextEnd = new Date(formData.end);
              const repeatSlots = sanitizedSlots.map(s => { const copy = { ...s, bids: [] }; delete copy.userId; delete copy.userName; return copy; });
              
              let iterations = 0;
              while (iterations < 52) { 
                  if (repeatFrequency === 'Daily') { nextStart.setDate(nextStart.getDate() + 1); nextEnd.setDate(nextEnd.getDate() + 1); } 
                  else { nextStart.setDate(nextStart.getDate() + 7); nextEnd.setDate(nextEnd.getDate() + 7); }
                  if (nextStart > untilDate) break;
                  const repeatRef = doc(collection(db, 'shifts'));
                  batch.set(repeatRef, { ...basePayload, start: Timestamp.fromDate(new Date(nextStart)), end: Timestamp.fromDate(new Date(nextEnd)), slots: repeatSlots, status: 'Open', timeRecords: {} });
                  iterations++;
              }
          }

          await batch.commit();
          setIsEditorOpen(false); setSelectedShift(null); setIsRepeating(false); setIsNewShift(false);
          // If in List view, refresh manually
          if (viewMode === 'List') fetchListShifts(true);
      } catch (e) {
          console.error("Save failed", e);
          alert("Failed to save shift.");
      } finally {
          setIsOperating(false);
      }
  };

  const handleCancelShift = async () => {
      if (!selectedShift) return;
      if (!confirm("Cancel this shift? Assigned staff will be notified.")) return;
      setIsOperating(true);
      try {
          const currentTags = selectedShift.tags || [];
          await updateDoc(doc(db, 'shifts', selectedShift.id), { status: 'Cancelled', tags: [...currentTags, 'Cancelled'] });
          selectedShift.slots?.forEach(slot => { if (slot.userId) sendNotification(slot.userId, "Shift Cancelled", `${selectedShift.location} shift cancelled.`, "alert", "/rota"); });
          setIsEditorOpen(false); setSelectedShift(null);
          if (viewMode === 'List') fetchListShifts(true);
      } catch (e) { alert("Failed to cancel."); } finally { setIsOperating(false); }
  };

  const handleDeleteShift = async () => {
      if (!selectedShift || !confirm("Delete permanently?")) return;
      setIsOperating(true);
      try { 
          await deleteDoc(doc(db, 'shifts', selectedShift.id)); 
          setIsEditorOpen(false); 
          setSelectedShift(null);
          if (viewMode === 'List') fetchListShifts(true);
      } catch(e) { alert("Failed to delete."); } finally { setIsOperating(false); }
  };

  const handleBid = async (slotIndex: number) => {
      if (!selectedShift || !user) return;
      setIsOperating(true);
      try {
          const updatedSlots = [...selectedShift.slots];
          const currentBids = updatedSlots[slotIndex].bids || [];
          if (currentBids.some(b => b.userId === user.uid)) return;
          updatedSlots[slotIndex] = { ...updatedSlots[slotIndex], bids: [...currentBids, { userId: user.uid, userName: user.name, userRole: user.role, timestamp: new Date().toISOString() }] };
          await updateDoc(doc(db, 'shifts', selectedShift.id), { slots: updatedSlots });
      } catch (e) { alert("Failed to place bid."); } finally { setIsOperating(false); }
  };

  const handleReportSick = async () => {
      if (!selectedShift || !user || !confirm("Report Sick? You will be removed from shift.")) return;
      setIsOperating(true);
      try {
          const newSlots = selectedShift.slots.map(s => s.userId === user.uid ? { ...s, userId: undefined, userName: undefined } : s);
          const currentTags = selectedShift.tags || [];
          await updateDoc(doc(db, 'shifts', selectedShift.id), { slots: newSlots, tags: [...currentTags, 'Cover Needed'], status: 'Open' });
          setIsBriefingOpen(false);
      } catch (e) { alert("Failed to report sick."); } finally { setIsOperating(false); }
  };

  const handleRequestSwap = async () => {
      if (!selectedShift || !user) return;
      if (!confirm("Request a shift swap? This will flag the shift for others to see.")) return;
      setIsOperating(true);
      try {
          const currentTags = selectedShift.tags || [];
          if (!currentTags.includes('Swap Requested')) {
              await updateDoc(doc(db, 'shifts', selectedShift.id), { tags: [...currentTags, 'Swap Requested'] });
          }
          setIsBriefingOpen(false);
      } catch (e) { alert("Failed to request swap."); } finally { setIsOperating(false); }
  };

  const handleOfferShift = async () => {
      if (!selectedShift || !user) return;
      if (!confirm("Offer this shift to the pool?")) return;
      setIsOperating(true);
      try {
          const currentTags = selectedShift.tags || [];
          if (!currentTags.includes('Offer Pending')) {
              await updateDoc(doc(db, 'shifts', selectedShift.id), { tags: [...currentTags, 'Offer Pending'] });
          }
          setIsBriefingOpen(false);
      } catch (e) { alert("Failed to offer shift."); } finally { setIsOperating(false); }
  };

  const handleRunAiAnalysis = async () => {
      if (!shifts.length) return;
      setAnalyzingRota(true);
      const summary = shifts.slice(0, 50).map(s => ({
          date: s.start.toLocaleDateString(),
          location: s.location,
          status: s.status,
          slotsTotal: s.slots.length,
          slotsFilled: s.slots.filter(sl => sl.userId).length,
          rolesNeeded: s.slots.filter(sl => !sl.userId).map(sl => sl.role)
      }));
      const result = await analyzeRotaCoverage(JSON.stringify(summary));
      setRotaAnalysis(result);
      setAnalyzingRota(false);
  };

  const handleAcceptBid = async (slotIndex: number, bidIndex: number) => {
      const slot = formSlots[slotIndex];
      if (!slot.bids || !slot.bids[bidIndex]) return;
      const winner = slot.bids[bidIndex];
      const newSlots = [...formSlots];
      newSlots[slotIndex] = { ...newSlots[slotIndex], userId: winner.userId, userName: winner.userName, bids: [] };
      setFormSlots(newSlots);
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

  const addResource = () => {
      if (!selectedAssetId) return;
      let resourceToAdd: ShiftResource | undefined;
      if (resourceType === 'Vehicle') { const v = allVehicles.find(v => v.id === selectedAssetId); if (v) resourceToAdd = { id: v.id, type: 'Vehicle', name: `${v.callSign} (${v.registration})` }; } 
      else { const k = allKits.find(k => k.id === selectedAssetId); if (k) resourceToAdd = { id: k.id, type: 'Kit', name: k.name }; }
      if (resourceToAdd) { const current = formData.resources || []; if (!current.some(r => r.id === resourceToAdd!.id)) setFormData({ ...formData, resources: [...current, resourceToAdd] }); }
      setSelectedAssetId('');
  };

  const removeResource = (id: string) => setFormData({ ...formData, resources: (formData.resources || []).filter(r => r.id !== id) });

  const openTimeManager = (uid: string, name: string) => {
      const existing = formData.timeRecords?.[uid];
      setManageTimeUser({ uid, name });
      setManageTimeData({
          in: existing?.clockInTime ? new Date(existing.clockInTime).toISOString().slice(0, 16) : '',
          out: existing?.clockOutTime ? new Date(existing.clockOutTime).toISOString().slice(0, 16) : ''
      });
  };

  const saveTimeData = () => {
      if (!manageTimeUser) return;
      
      const newRecord: TimeRecord = {
          userId: manageTimeUser.uid,
          clockInTime: manageTimeData.in ? new Date(manageTimeData.in).toISOString() : '',
          clockOutTime: manageTimeData.out ? new Date(manageTimeData.out).toISOString() : undefined,
          clockInLocation: 'MANUAL_EDIT'
      };

      setFormData(prev => ({
          ...prev,
          timeRecords: {
              ...prev.timeRecords,
              [manageTimeUser.uid]: newRecord
          }
      }));
      
      setManageTimeUser(null);
  };

  // --- Renderers ---
  const renderMonthView = () => {
      const gridDays = getCalendarDays(currentDate);
      const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const visibleShifts = getVisibleShifts();

      return (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden animate-in fade-in">
              <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                  {weekDays.map(wd => ( <div key={wd} className="py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">{wd}</div> ))}
              </div>
              <div className="grid grid-cols-7 auto-rows-fr bg-slate-200 dark:bg-slate-700 gap-px border-b border-l border-slate-200 dark:border-slate-700">
                  {gridDays.map((day, idx) => {
                      const isToday = day.toDateString() === new Date().toDateString();
                      const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                      const dayShifts = visibleShifts.filter(s => s.start.getDate() === day.getDate() && s.start.getMonth() === day.getMonth());

                      return (
                          <div key={idx} onClick={() => isManager && handleCreateInit(day)} className={`min-h-[120px] p-2 bg-white dark:bg-slate-800 transition-colors relative group ${!isCurrentMonth ? 'bg-slate-50/50 dark:bg-slate-800/50' : ''} ${isManager ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700' : ''}`}>
                              <div className={`text-xs font-bold mb-2 flex justify-between items-center ${isToday ? 'text-ams-blue' : 'text-slate-500 dark:text-slate-400'}`}>
                                  <span className={`w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-ams-blue text-white' : ''}`}>{day.getDate()}</span>
                                  {isManager && <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />}
                              </div>
                              <div className="space-y-1.5">
                                  {dayShifts.slice(0, 4).map(s => (
                                      <div key={s.id} onClick={(e) => handleShiftClick(s, e)} className={`text-[10px] px-2 py-1 rounded-md border-l-2 truncate cursor-pointer shadow-sm hover:shadow-md transition-all ${getShiftColor(s)}`}>
                                          <div className="font-bold flex justify-between"><span>{s.start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span></div>
                                          <div className="truncate font-medium opacity-90">{s.location}</div>
                                          {s.address && <div className="truncate opacity-75 text-[9px] flex items-center gap-0.5"><MapPin size={8} /> {s.address}</div>}
                                      </div>
                                  ))}
                                  {dayShifts.length > 4 && <div className="text-[10px] text-slate-400 text-center font-bold mt-1 bg-slate-100 dark:bg-slate-700 rounded py-0.5">+{dayShifts.length - 4} more</div>}
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      );
  };

  const renderWeekView = () => {
      const startOfWeek = getStartOfWeek(currentDate);
      const days = Array.from({length: 7}, (_, i) => { const d = new Date(startOfWeek); d.setDate(d.getDate() + i); return d; });
      const visibleShifts = getVisibleShifts();

      return (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4 animate-in fade-in">
              {days.map(day => {
                  const isToday = day.toDateString() === new Date().toDateString();
                  const dayShifts = visibleShifts.filter(s => s.start.getDate() === day.getDate() && s.start.getMonth() === day.getMonth());
                  return (
                      <div key={day.toISOString()} className={`flex flex-col gap-3 min-h-[400px] ${isToday ? 'bg-blue-50/30 dark:bg-blue-900/10 rounded-xl -m-2 p-2 border border-blue-100 dark:border-blue-900' : ''}`}>
                          <div className={`text-center py-3 border-b border-slate-200 dark:border-slate-700 ${isToday ? 'text-ams-blue font-bold' : 'text-slate-600 dark:text-slate-400'}`}>
                              <div className="text-xs uppercase tracking-wider">{day.toLocaleDateString('en-GB', {weekday: 'short'})}</div>
                              <div className="text-xl font-bold mt-1">{day.getDate()}</div>
                          </div>
                          <div className="space-y-3 flex-1">
                              {dayShifts.map(s => (
                                  <div key={s.id} onClick={(e) => handleShiftClick(s, e)} className={`p-3 rounded-lg border-l-4 text-xs shadow-sm cursor-pointer hover:shadow-md transition-all group ${getShiftColor(s)}`}>
                                      <div className="flex justify-between items-start mb-2 pb-2 border-b border-black/5 dark:border-white/5">
                                          <div className="font-bold text-sm">{s.start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                                      </div>
                                      <div className="font-bold truncate opacity-90 mb-1 text-[11px] flex items-center gap-1"><Briefcase className="w-3 h-3" /> {s.location}</div>
                                      {s.address && <div className="truncate opacity-75 mb-2 text-[10px] flex items-center gap-1"><MapPin className="w-3 h-3" /> {s.address}</div>}
                                      <div className="space-y-1">
                                          {s.slots.map((slot, i) => (
                                              <div key={i} className="flex items-center gap-1.5 bg-white/40 dark:bg-black/20 p-1 rounded">
                                                  <div className={`w-2 h-2 rounded-full ${slot.userId ? 'bg-green-500' : 'bg-red-500'}`} />
                                                  <span className={`truncate flex-1 ${!slot.userId && 'text-red-700 dark:text-red-300 font-bold'}`}>{slot.userName ? slot.userName.split(' ')[0] : slot.role}</span>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  );
              })}
          </div>
      );
  };

  const renderListView = () => {
      const filtered = getVisibleShifts();
      return (
          <div className="space-y-4 animate-in fade-in">
              {filtered.map(s => (
                  <div key={s.id} onClick={(e) => handleShiftClick(s, e)} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer hover:border-ams-blue transition-colors shadow-sm">
                      <div className="flex items-center gap-4">
                          <div className={`p-4 rounded-xl text-center min-w-[70px] ${getShiftColor(s)}`}>
                              <div className="text-xs uppercase font-bold opacity-75">{s.start.toLocaleDateString('en-GB', {weekday:'short'})}</div>
                              <div className="text-2xl font-bold">{s.start.getDate()}</div>
                          </div>
                          <div>
                              <h3 className="font-bold text-slate-800 dark:text-white text-lg">{s.location}</h3>
                              {s.address && <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3"/> {s.address}</p>}
                              <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-1"><Clock className="w-3 h-3" /> {s.start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - {s.end.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                          </div>
                      </div>
                  </div>
              ))}
              
              {hasMore && (
                  <div className="text-center pt-4">
                      <button 
                        onClick={() => fetchListShifts(false)} 
                        disabled={loadingMore}
                        className="px-6 py-2 bg-slate-100 dark:bg-slate-800 rounded-full font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                      >
                          {loadingMore ? 'Loading...' : 'Load More Shifts'}
                      </button>
                  </div>
              )}
          </div>
      );
  };

  return (
    <div className="space-y-6 pb-20">
      {/* AI Analysis Widget */}
      {isManager && rotaAnalysis && (
          <div className="bg-gradient-to-r from-purple-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden animate-in fade-in slide-in-from-top-4 border border-purple-500/30">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none"><Sparkles className="w-48 h-48" /></div>
              <div className="flex justify-between items-start relative z-10">
                  <div>
                      <h3 className="text-lg font-bold flex items-center gap-2 mb-2"><Sparkles className="w-5 h-5 text-purple-400" /> AI Rota Insight</h3>
                      <p className="text-sm text-purple-100 whitespace-pre-line">{rotaAnalysis}</p>
                  </div>
                  <button onClick={() => setRotaAnalysis(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-5 h-5" /></button>
              </div>
          </div>
      )}

      {/* Header Controls */}
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
              <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
                  {['Month', 'Week', 'List'].map(m => (
                      <button key={m} onClick={() => setViewMode(m as any)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === m ? 'bg-white dark:bg-slate-600 shadow text-ams-blue dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>{m}</button>
                  ))}
              </div>
              
              <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
                  {['All', 'MyShifts', 'Available'].map(f => (
                      <button key={f} onClick={() => setFilterMode(f as any)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filterMode === f ? 'bg-white dark:bg-slate-600 shadow text-ams-blue dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                          {f === 'MyShifts' ? 'My Shifts' : f}
                      </button>
                  ))}
              </div>

              {isManager && (
                  <>
                    <button onClick={() => handleCreateInit()} className="px-4 py-2 bg-ams-blue text-white rounded-xl font-bold text-sm shadow-md hover:bg-blue-700 transition-all flex items-center gap-2">
                        <Plus className="w-4 h-4" /> New Shift
                    </button>
                    <button onClick={handleRunAiAnalysis} disabled={analyzingRota} className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-purple-700 transition-all flex items-center gap-2 disabled:opacity-50">
                        {analyzingRota ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} AI Analyze
                    </button>
                  </>
              )}
          </div>
      </div>

      {/* Main Content */}
      {viewMode === 'Month' && renderMonthView()}
      {viewMode === 'Week' && renderWeekView()}
      {viewMode === 'List' && renderListView()}

      {/* Shift Editor (Manager) */}
      {isEditorOpen && formData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in duration-200">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700">
                  {/* ... Editor Content ... */}
                  <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                      <h3 className="font-bold text-lg text-slate-800 dark:text-white">{isNewShift ? 'Create Shift' : 'Edit Shift'}</h3>
                      <button onClick={() => setIsEditorOpen(false)}><X className="w-6 h-6 text-slate-400" /></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Left: Details */}
                          <div className="space-y-4">
                              <div><label className="text-xs font-bold text-slate-500 uppercase">Location / Event Name</label><input className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={formData.location || ''} onChange={e => setFormData({...formData, location: e.target.value})} /></div>
                              <div>
                                  <label className="text-xs font-bold text-slate-500 uppercase flex justify-between">Address <button onClick={useCurrentLocation} className="text-ams-blue flex items-center gap-1"><MapPin className="w-3 h-3" /> GPS</button></label>
                                  <input className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                  <div><label className="text-xs font-bold text-slate-500 uppercase">Start</label><input type="datetime-local" className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={formData.start ? new Date(formData.start.getTime() - (formData.start.getTimezoneOffset() * 60000)).toISOString().slice(0,16) : ''} onChange={e => setFormData({...formData, start: new Date(e.target.value)})} /></div>
                                  <div><label className="text-xs font-bold text-slate-500 uppercase">End</label><input type="datetime-local" className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={formData.end ? new Date(formData.end.getTime() - (formData.end.getTimezoneOffset() * 60000)).toISOString().slice(0,16) : ''} onChange={e => setFormData({...formData, end: new Date(e.target.value)})} /></div>
                              </div>
                              <div><label className="text-xs font-bold text-slate-500 uppercase">Notes</label><textarea className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white" rows={3} value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} /></div>
                              
                              {/* Repeating Options */}
                              {isNewShift && (
                                  <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border dark:border-slate-700">
                                      <label className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300 text-sm mb-2"><input type="checkbox" checked={isRepeating} onChange={e => setIsRepeating(e.target.checked)} /> Repeat Shift</label>
                                      {isRepeating && (
                                          <div className="flex gap-2">
                                              <select className="p-2 rounded border text-sm dark:bg-slate-700 dark:text-white" value={repeatFrequency} onChange={e => setRepeatFrequency(e.target.value as any)}><option>Daily</option><option>Weekly</option></select>
                                              <input type="date" className="p-2 rounded border text-sm dark:bg-slate-700 dark:text-white" value={repeatUntil} onChange={e => setRepeatUntil(e.target.value)} />
                                          </div>
                                      )}
                                  </div>
                              )}
                          </div>

                          {/* Right: Slots & Resources */}
                          <div className="space-y-6">
                              <div>
                                  <div className="flex justify-between items-center mb-2"><h4 className="font-bold text-sm text-slate-700 dark:text-white">Staffing Slots</h4><button onClick={addSlot} className="text-xs bg-ams-blue text-white px-2 py-1 rounded">+ Add Slot</button></div>
                                  <div className="space-y-2 max-h-60 overflow-y-auto">
                                      {formSlots.map((slot, idx) => (
                                          <div key={idx} className="p-3 border rounded-lg bg-slate-50 dark:bg-slate-900 dark:border-slate-700">
                                              <div className="flex justify-between mb-2">
                                                  <select className="text-xs p-1 rounded border dark:bg-slate-700 dark:text-white" value={slot.role} onChange={e => updateSlot(idx, 'role', e.target.value)}>{Object.values(Role).map(r => <option key={r}>{r}</option>)}</select>
                                                  <button onClick={() => removeSlot(idx)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                                              </div>
                                              <select className="w-full text-xs p-2 rounded border dark:bg-slate-700 dark:text-white" value={slot.userId || ''} onChange={e => updateSlot(idx, 'userId', e.target.value)}>
                                                  <option value="">-- Unassigned --</option>
                                                  {allStaff.map(s => <option key={s.uid} value={s.uid}>{s.name} ({s.role})</option>)}
                                              </select>
                                              {/* Bids */}
                                              {slot.bids && slot.bids.length > 0 && !slot.userId && (
                                                  <div className="mt-2 pt-2 border-t dark:border-slate-700">
                                                      <span className="text-[10px] font-bold text-slate-500 uppercase">Applicants:</span>
                                                      {slot.bids.map((bid, bIdx) => (
                                                          <div key={bIdx} className="flex justify-between items-center text-xs mt-1 bg-white dark:bg-slate-800 p-1 rounded">
                                                              <span>{bid.userName} ({bid.userRole})</span>
                                                              <button onClick={() => handleAcceptBid(idx, bIdx)} className="text-green-600 font-bold hover:underline">Accept</button>
                                                          </div>
                                                      ))}
                                                  </div>
                                              )}
                                          </div>
                                      ))}
                                  </div>
                              </div>

                              <div>
                                  <div className="flex justify-between items-center mb-2"><h4 className="font-bold text-sm text-slate-700 dark:text-white">Resources</h4></div>
                                  <div className="flex gap-2 mb-2">
                                      <select className="flex-1 text-xs p-2 rounded border dark:bg-slate-700 dark:text-white" value={selectedAssetId} onChange={e => setSelectedAssetId(e.target.value)}>
                                          <option value="">Select Asset...</option>
                                          {resourceType === 'Vehicle' ? allVehicles.map(v => <option key={v.id} value={v.id}>{v.callSign}</option>) : allKits.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                                      </select>
                                      <button onClick={() => setResourceType(resourceType === 'Vehicle' ? 'Kit' : 'Vehicle')} className="px-2 border rounded text-xs dark:text-white">{resourceType}</button>
                                      <button onClick={addResource} className="px-3 bg-green-500 text-white rounded text-xs font-bold">+</button>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                      {formData.resources?.map(r => (
                                          <span key={r.id} className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-xs flex items-center gap-1 dark:text-white">
                                              {r.type === 'Vehicle' ? <Truck className="w-3 h-3" /> : <Briefcase className="w-3 h-3" />} {r.name}
                                              <button onClick={() => removeResource(r.id)}><X className="w-3 h-3 hover:text-red-500" /></button>
                                          </span>
                                      ))}
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
                      <div className="flex gap-2">
                          {!isNewShift && (
                              <>
                                <button onClick={handleDeleteShift} className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-bold text-sm border border-red-200 dark:border-red-800">Delete</button>
                                <button onClick={handleDuplicate} className="px-4 py-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg font-bold text-sm border border-blue-200 dark:border-blue-800">Duplicate</button>
                                <button onClick={handleCancelShift} className="px-4 py-2 text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg font-bold text-sm border border-slate-300 dark:border-slate-600">Cancel Shift</button>
                              </>
                          )}
                      </div>
                      <div className="flex gap-2">
                          <button onClick={() => setIsEditorOpen(false)} className="px-6 py-2 text-slate-500 font-bold hover:bg-slate-200 rounded-lg transition-colors">Close</button>
                          <button onClick={handleSaveShift} disabled={isOperating} className="px-8 py-2 bg-ams-blue text-white font-bold rounded-lg hover:bg-blue-700 shadow-md flex items-center gap-2">
                              {isOperating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Briefing Modal (Staff) */}
      {isBriefingOpen && selectedShift && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in duration-200">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="bg-ams-blue p-6 text-white relative">
                      <h3 className="text-xl font-bold">{selectedShift.location}</h3>
                      <p className="opacity-90 text-sm flex items-center gap-2 mt-1"><Clock className="w-4 h-4" /> {selectedShift.start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - {selectedShift.end.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                      <button onClick={() => setIsBriefingOpen(false)} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full"><X className="w-5 h-5" /></button>
                  </div>
                  
                  <div className="p-6 space-y-6">
                      {selectedShift.address && (
                          <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                              <MapPin className="w-5 h-5 text-ams-blue mt-0.5" />
                              <div>
                                  <p className="text-sm font-bold text-slate-700 dark:text-white">Address / Coordinates</p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">{selectedShift.address}</p>
                                  <a href={`https://maps.google.com/?q=${selectedShift.address}`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 font-bold hover:underline mt-1 block">Open Maps</a>
                              </div>
                          </div>
                      )}

                      <div>
                          <h4 className="text-sm font-bold text-slate-500 uppercase mb-2">Team & Roles</h4>
                          <div className="space-y-2">
                              {selectedShift.slots?.map((slot, idx) => (
                                  <div key={idx} className="flex justify-between items-center p-2 rounded bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                                      <div className="flex items-center gap-2">
                                          <div className={`w-2 h-2 rounded-full ${slot.userId ? 'bg-green-500' : 'bg-red-500'}`} />
                                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{slot.role}</span>
                                      </div>
                                      <span className="text-sm text-slate-600 dark:text-slate-400">{slot.userName || 'Open'}</span>
                                      {/* Bid Button if slot is open and user matches role */}
                                      {!slot.userId && !isManager && (
                                          <button 
                                            onClick={() => handleBid(idx)} 
                                            disabled={slot.bids?.some(b => b.userId === user?.uid)}
                                            className="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded hover:bg-green-700 disabled:opacity-50"
                                          >
                                              {slot.bids?.some(b => b.userId === user?.uid) ? 'Applied' : 'Apply'}
                                          </button>
                                      )}
                                  </div>
                              ))}
                          </div>
                      </div>

                      {/* My Actions */}
                      {selectedShift.slots?.some(s => s.userId === user?.uid) && (
                          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                              <button onClick={handleRequestSwap} className="py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50">Request Swap</button>
                              <button onClick={handleReportSick} className="py-2 border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-xs font-bold">Report Sick</button>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default RotaPage;
