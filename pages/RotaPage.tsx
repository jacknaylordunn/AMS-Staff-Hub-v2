
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, MapPin, Clock, CheckCircle, 
  Calendar as CalendarIcon, Filter, Plus, X, Repeat, Loader2, 
  Briefcase, Truck, Users, Search, Trash2, UserPlus, 
  Sparkles, Save, Edit3, UserCheck, AlertCircle, ArrowRight, Bell,
  Palmtree, AlertOctagon, RefreshCw, MoreHorizontal, UserMinus, Flame, Ban, Copy, CalendarRange, Hand, MousePointerClick, Navigation, DollarSign, List, Map, ExternalLink
} from 'lucide-react';
import { Shift, Role, User, ShiftSlot, Vehicle, MedicalKit, ShiftResource, TimeRecord, Unavailability, ShiftBid } from '../types';
import { useAuth } from '../hooks/useAuth';
import { db } from '../services/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, orderBy, Timestamp, getDocs, writeBatch, limit, getDoc, setDoc } from 'firebase/firestore';
import { useToast } from '../context/ToastContext';
import LeafletMap from '../components/LeafletMap';
import AddressAutocomplete from '../components/AddressAutocomplete';
import { canPerformRole } from '../utils/roleHelper';
import { sendNotification } from '../services/notificationService';

// Default Fallback Rates
const DEFAULT_RATES: Record<string, number> = {
    [Role.Doctor]: 70,
    [Role.Nurse]: 35,
    [Role.Paramedic]: 25,
    [Role.EMT]: 18,
    [Role.FREC4]: 16,
    [Role.FREC3]: 14,
    [Role.FirstAider]: 12,
    [Role.Welfare]: 12,
    [Role.Manager]: 30,
    [Role.Admin]: 15
};

const RotaPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isManager = user?.role === Role.Manager || user?.role === Role.Admin;

  const [viewMode, setViewMode] = useState<'Month' | 'Week' | 'List' | 'Timesheet'>('Month');
  const [filterMode, setFilterMode] = useState<'All' | 'My' | 'Available'>('All');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Data for Selectors
  const [allStaff, setAllStaff] = useState<User[]>([]); 
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [allKits, setAllKits] = useState<MedicalKit[]>([]);
  
  // Editor State
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isBriefingOpen, setIsBriefingOpen] = useState(false);
  const [isNewShift, setIsNewShift] = useState(false);

  // Form Data
  const [formData, setFormData] = useState<Partial<Shift>>({});
  const [formSlots, setFormSlots] = useState<ShiftSlot[]>([]);
  
  // Features State
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [repeatUntil, setRepeatUntil] = useState<string>(''); // Date string
  const [isRepeating, setIsRepeating] = useState(false);
  const [repeatFreq, setRepeatFreq] = useState<'Daily' | 'Weekly'>('Daily');

  // Unavailability Logic
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [myUnavailability, setMyUnavailability] = useState<Unavailability[]>([]);
  const [allUnavailability, setAllUnavailability] = useState<Unavailability[]>([]); // For Managers
  const [unavailForm, setUnavailForm] = useState({ start: '', end: '', type: 'Holiday', reason: '' });

  // Payroll State
  const [roleRates, setRoleRates] = useState<Record<string, number>>(DEFAULT_RATES);
  const [showPayrollModal, setShowPayrollModal] = useState(false);

  // Helpers
  const getShiftColor = (shift: Shift) => {
      if (shift.status === 'Cancelled') return 'border-l-slate-500 bg-slate-100/80 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 grayscale opacity-75';
      const now = new Date();
      const endTimePlusOne = new Date(shift.end.getTime() + 60 * 60 * 1000);
      if (now > endTimePlusOne) return 'border-l-slate-400 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 opacity-75 grayscale';
      const isCritical = shift.tags?.includes('Cover Needed') || shift.tags?.includes('Critical');
      if (isCritical) return 'border-l-red-500 bg-red-50/80 dark:bg-red-900/30 text-red-700 dark:text-red-200 animate-pulse';
      const allSlotsFilled = shift.slots && shift.slots.length > 0 && shift.slots.every(s => !!s.userId);
      if (shift.status === 'Filled' || allSlotsFilled) return 'border-l-blue-500 bg-blue-50/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200';
      
      // If I'm on the shift, make it distinctly my color
      if (user && shift.slots.some(s => s.userId === user.uid)) {
          return 'border-l-amber-500 bg-amber-50/80 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200';
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

  const isSameDay = (d1: Date, d2: Date) => {
      return d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
  };

  // --- Filtering Logic ---
  const filteredShifts = useMemo(() => {
      if (filterMode === 'All') return shifts;
      
      return shifts.filter(shift => {
          if (filterMode === 'My') {
              return shift.slots.some(s => s.userId === user?.uid);
          }
          if (filterMode === 'Available') {
              // Not cancelled, not fully filled, and has at least one empty slot
              return shift.status !== 'Cancelled' && 
                     shift.status !== 'Filled' && 
                     shift.slots.some(s => !s.userId);
          }
          return true;
      });
  }, [shifts, filterMode, user]);

  const getShiftsForDay = (date: Date) => {
      return filteredShifts.filter(s => isSameDay(s.start, date));
  };

  // --- Fetch Logic ---
  useEffect(() => {
    setIsLoading(true);
    let q;

    if (viewMode === 'Timesheet') {
        const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        q = query(collection(db, 'shifts'), where('start', '>=', Timestamp.fromDate(start)), where('start', '<=', Timestamp.fromDate(end)), orderBy('start', 'asc'));
    } else if (viewMode === 'List') {
        // List View: Active & Upcoming (Start from today 00:00)
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        q = query(collection(db, 'shifts'), where('start', '>=', Timestamp.fromDate(now)), orderBy('start', 'asc'), limit(50));
    } else {
        // Month / Week
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
    if (isManager && allStaff.length === 0) {
        getDocs(collection(db, 'users')).then(snap => setAllStaff(snap.docs.map(d => ({ uid: d.id, ...d.data() } as User)).filter(u => u.status === 'Active')));
        getDocs(collection(db, 'fleet')).then(snap => setAllVehicles(snap.docs.map(d => ({ id: d.id, ...d.data() } as Vehicle))));
        getDocs(collection(db, 'medical_kits')).then(snap => setAllKits(snap.docs.map(d => ({ id: d.id, ...d.data() } as MedicalKit))));
    }
  }, [isManager]);

  // Load Rates
  useEffect(() => {
      const loadRates = async () => {
          const docRef = doc(db, 'system', 'settings');
          const snap = await getDoc(docRef);
          if (snap.exists() && snap.data().payrollRates) {
              setRoleRates(snap.data().payrollRates);
          }
      };
      loadRates();
  }, []);

  // Fetch My Unavailability
  useEffect(() => {
      if (user) {
          const q = query(collection(db, 'unavailability'), where('userId', '==', user.uid));
          const unsub = onSnapshot(q, (snap) => setMyUnavailability(snap.docs.map(d => ({ id: d.id, ...d.data() } as Unavailability))));
          return () => unsub();
      }
  }, [user]);

  // Fetch All Unavailability (Manager Only)
  useEffect(() => {
      if (isManager) {
          const q = query(collection(db, 'unavailability'));
          const unsub = onSnapshot(q, (snap) => {
              setAllUnavailability(snap.docs.map(d => ({ id: d.id, ...d.data() } as Unavailability)));
          });
          return () => unsub();
      }
  }, [isManager]);

  // Sync Form Data when opening existing shift
  useEffect(() => {
      if (isEditorOpen && selectedShift && !isNewShift) {
          setFormData({ 
              ...selectedShift, 
              // Ensure dates are copied correctly
              start: selectedShift.start, 
              end: selectedShift.end,
              timeRecords: selectedShift.timeRecords || {}
          });
          setFormSlots(selectedShift.slots || []);
          setIsRepeating(false); 
          setShowAddressPicker(false);
          setRepeatUntil('');
      }
  }, [isEditorOpen, selectedShift, isNewShift]);

  const handleShiftClick = (shift: Shift, e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedShift(shift);
      if (isManager) { 
          setIsNewShift(false); 
          setIsEditorOpen(true); 
      } else { 
          // Open Briefing Modal for Non-Managers
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
      setShowAddressPicker(false); 
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

  // --- Handlers ---

  const handleSaveShift = async () => {
      if (!formData.start || !formData.end || !formData.location) {
          toast.error("Please fill in all required fields.");
          return;
      }
      
      try {
          const batch = writeBatch(db);
          const baseStart = new Date(formData.start);
          const baseEnd = new Date(formData.end);
          const duration = baseEnd.getTime() - baseStart.getTime();

          const shiftsToCreate = [];
          shiftsToCreate.push(baseStart);

          // Logic for Repeating by Date
          if (isNewShift && isRepeating && repeatUntil) {
              const endDate = new Date(repeatUntil);
              endDate.setHours(23, 59, 59, 999);
              
              let nextDate = new Date(baseStart);
              // Daily adds 1 day, Weekly adds 7 days
              const increment = repeatFreq === 'Daily' ? 1 : 7;
              
              nextDate.setDate(nextDate.getDate() + increment);

              while (nextDate <= endDate) {
                  shiftsToCreate.push(new Date(nextDate));
                  nextDate.setDate(nextDate.getDate() + increment);
              }
          }

          // Identify newly assigned users for notification
          const assignedUsersToNotify: string[] = [];
          if (selectedShift) {
              // Check diff
              formSlots.forEach(slot => {
                  const originalSlot = selectedShift.slots.find(s => s.id === slot.id);
                  if (slot.userId && (!originalSlot || originalSlot.userId !== slot.userId)) {
                      assignedUsersToNotify.push(slot.userId);
                  }
              });
          } else {
              // New shift, check all slots
              formSlots.forEach(slot => {
                  if (slot.userId) assignedUsersToNotify.push(slot.userId);
              });
          }

          for (const startDt of shiftsToCreate) {
              const endDt = new Date(startDt.getTime() + duration);
              
              const payload = {
                  ...formData,
                  slots: formSlots,
                  createdBy: user?.uid,
                  start: Timestamp.fromDate(startDt),
                  end: Timestamp.fromDate(endDt),
                  timeRecords: formData.timeRecords || {}
              };

              if (isNewShift) {
                  const ref = doc(collection(db, 'shifts'));
                  batch.set(ref, payload);
              } else if (selectedShift) {
                  // If editing, usually only edit single unless complex logic added (kept simple here)
                  const ref = doc(db, 'shifts', selectedShift.id);
                  batch.update(ref, payload);
              }
          }

          await batch.commit();

          // Send Notifications
          assignedUsersToNotify.forEach(uid => {
              sendNotification(
                  uid,
                  "Shift Assigned",
                  `You have been assigned a shift at ${formData.location} on ${baseStart.toLocaleDateString()}.`,
                  'success',
                  '/rota'
              );
          });

          setIsEditorOpen(false);
          toast.success(shiftsToCreate.length > 1 ? `${shiftsToCreate.length} shifts created` : "Shift Saved");
      } catch (e) {
          toast.error("Failed to save shift");
          console.error(e);
      }
  };

  const handleCancelShift = async () => {
      if (!selectedShift || isNewShift) return;
      if (!confirm("Are you sure you want to CANCEL this shift? It will appear greyed out on the rota.")) return;
      try {
          await updateDoc(doc(db, 'shifts', selectedShift.id), { status: 'Cancelled' });
          
          // Notify assigned staff
          selectedShift.slots.forEach(slot => {
              if (slot.userId) {
                  sendNotification(
                      slot.userId,
                      "Shift Cancelled",
                      `Your shift at ${selectedShift.location} on ${selectedShift.start.toLocaleDateString()} has been cancelled.`,
                      'alert',
                      '/rota'
                  );
              }
          });

          setIsEditorOpen(false);
          toast.success("Shift Cancelled");
      } catch (e) {
          toast.error("Failed to cancel shift");
      }
  };

  const handleDeleteShift = async () => {
      if (!selectedShift || isNewShift) return;
      if (!confirm("Are you sure you want to DELETE this shift entirely? This cannot be undone.")) return;
      try {
          await deleteDoc(doc(db, 'shifts', selectedShift.id));
          setIsEditorOpen(false);
          toast.success("Shift Deleted");
      } catch (e) {
          toast.error("Failed to delete shift");
      }
  };

  const addResource = (type: 'Vehicle' | 'Kit', id: string) => {
      if (!id) return;
      let name = '';
      if (type === 'Vehicle') {
          name = allVehicles.find(v => v.id === id)?.callSign || 'Unknown';
      } else {
          name = allKits.find(k => k.id === id)?.name || 'Unknown';
      }
      
      const newRes: ShiftResource = { id, type, name };
      const current = formData.resources || [];
      if (!current.some(r => r.id === id)) {
          setFormData({ ...formData, resources: [...current, newRes] });
      }
  };

  const removeResource = (id: string) => {
      setFormData({ ...formData, resources: (formData.resources || []).filter(r => r.id !== id) });
  };

  const addSlot = () => {
      setFormSlots([...formSlots, { id: `slot_${Date.now()}`, role: Role.Paramedic, bids: [] }]);
  };

  const removeSlot = (index: number) => {
      setFormSlots(formSlots.filter((_, i) => i !== index));
  };

  const updateSlot = (index: number, field: keyof ShiftSlot, value: any) => {
      const newSlots = [...formSlots];
      (newSlots[index] as any)[field] = value;
      
      if (field === 'userId') {
          const u = allStaff.find(s => s.uid === value);
          newSlots[index].userName = u ? u.name : undefined;
      }
      setFormSlots(newSlots);
  };

  const handleBid = async (slotId: string) => {
      if (!user || !selectedShift) return;
      
      const updatedSlots = selectedShift.slots.map(slot => {
          if (slot.id === slotId) {
              const currentBids = slot.bids || [];
              if (currentBids.some(b => b.userId === user.uid)) return slot; // Already bid
              
              return {
                  ...slot,
                  bids: [
                      ...currentBids,
                      {
                          userId: user.uid,
                          userName: user.name,
                          userRole: user.role,
                          timestamp: new Date().toISOString()
                      }
                  ]
              };
          }
          return slot;
      });

      try {
          await updateDoc(doc(db, 'shifts', selectedShift.id), { slots: updatedSlots });
          toast.success("Shift request sent to manager");
          setSelectedShift({ ...selectedShift, slots: updatedSlots }); // Optimistic update
      } catch (e) {
          toast.error("Failed to send request");
      }
  };

  // --- Unavailability Handlers ---
  const handleAddUnavailability = async () => {
      if (!unavailForm.start || !unavailForm.end || !user) return;
      try {
          await addDoc(collection(db, 'unavailability'), {
              userId: user.uid,
              start: unavailForm.start,
              end: unavailForm.end,
              type: unavailForm.type,
              reason: unavailForm.reason
          });
          setUnavailForm({ start: '', end: '', type: 'Holiday', reason: '' });
          toast.success("Availability updated");
      } catch(e) {
          toast.error("Failed to add unavailability");
      }
  };

  const handleDeleteUnavailability = async (id: string) => {
      if(!confirm("Remove this entry?")) return;
      try {
          await deleteDoc(doc(db, 'unavailability', id));
          toast.success("Entry removed");
      } catch(e) {
          toast.error("Failed to remove");
      }
  };

  const getUnavailability = (uid: string, shiftStart: Date, shiftEnd: Date) => {
      // Use allUnavailability if manager, checking conflicts for others
      const source = isManager ? allUnavailability : myUnavailability;
      
      return source.find(u => {
          if (u.userId !== uid) return false;
          // Simple date string comparison often fails timezones, better to use standard dates
          // Assuming u.start/end are YYYY-MM-DD strings
          const uStart = new Date(u.start); 
          uStart.setHours(0,0,0,0);
          const uEnd = new Date(u.end);
          uEnd.setHours(23,59,59,999);
          
          // Check overlap
          return (shiftStart < uEnd && shiftEnd > uStart);
      });
  };

  const calculateTimesheet = () => {
      const summary: Record<string, { name: string, role: string, shifts: number, hours: number, rate: number }> = {};
      
      shifts.forEach(s => {
          if (s.timeRecords) {
              Object.entries(s.timeRecords).forEach(([uid, recordData]) => {
                  const record = recordData as TimeRecord;
                  if (record.durationMinutes) {
                      if (!summary[uid]) {
                          const user = allStaff.find(u => u.uid === uid);
                          const role = user?.role || 'Pending';
                          // Use dynamic role-based rate
                          const rate = roleRates[role] || 20; 
                          
                          summary[uid] = { 
                              name: user?.name || 'Unknown', 
                              role: role,
                              shifts: 0, 
                              hours: 0,
                              rate: rate
                          };
                      }
                      summary[uid].shifts += 1;
                      summary[uid].hours += record.durationMinutes / 60;
                  }
              });
          }
      });
      return Object.values(summary);
  };

  const handleSaveRates = async () => {
      try {
          await setDoc(doc(db, 'system', 'settings'), { payrollRates: roleRates }, { merge: true });
          toast.success("Payroll rates updated");
          setShowPayrollModal(false);
      } catch (e) {
          toast.error("Failed to save rates");
      }
  };

  const openDirections = () => {
      if (!selectedShift) return;
      let query = selectedShift.address || selectedShift.location;
      // If address contains lat/long pipe format
      if (query.includes('|')) {
          const parts = query.split('|');
          const coords = parts[0]; // lat,lng
          window.open(`https://www.google.com/maps/dir/?api=1&destination=${coords}`, '_blank');
      } else {
          window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank');
      }
  };

  // Helper to safely parse coordinates for map display
  const getShiftCoordinates = (address?: string) => {
      if (!address) return null;
      
      let latStr, lngStr;
      
      // Try Pipe format: "lat,lng|address"
      if (address.includes('|')) {
          const [coords] = address.split('|');
          const parts = coords.split(',');
          if (parts.length === 2) {
              latStr = parts[0];
              lngStr = parts[1];
          }
      } 
      // Try Raw Coords: "lat,lng"
      else if (address.includes(',')) {
          const parts = address.split(',');
          // Simple validation to check if it looks like numbers
          if (parts.length === 2 && !isNaN(parseFloat(parts[0])) && !isNaN(parseFloat(parts[1]))) {
              latStr = parts[0];
              lngStr = parts[1];
          }
      }

      if (latStr && lngStr) {
          const lat = parseFloat(latStr);
          const lng = parseFloat(lngStr);
          if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
      }
      
      return null;
  };

  const editorCoords = getShiftCoordinates(formData.address);

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

          <div className="flex flex-wrap gap-2 items-center">
              {/* Filter Control */}
              <div className="bg-slate-100 dark:bg-slate-700 p-1 rounded-xl flex items-center">
                  <Filter className="w-4 h-4 text-slate-500 ml-2 mr-1" />
                  <select 
                    value={filterMode} 
                    onChange={(e) => setFilterMode(e.target.value as any)}
                    className="bg-transparent border-none text-xs font-bold text-slate-600 dark:text-slate-300 outline-none pr-2 py-2 cursor-pointer"
                  >
                      <option value="All">All Shifts</option>
                      <option value="My">My Shifts</option>
                      <option value="Available">{isManager ? 'Unallocated' : 'Available to Request'}</option>
                  </select>
              </div>

              <button onClick={() => setShowAvailabilityModal(true)} className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-white rounded-xl font-bold text-sm shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2">
                  <Palmtree className="w-4 h-4" /> My Availability
              </button>
              <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
                  {['Month', 'Week', 'List', ...(isManager ? ['Timesheet'] : [])].map(m => (
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
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <div key={day} className="bg-slate-50 dark:bg-slate-800 p-2 text-center text-xs font-bold text-slate-500 uppercase">{day}</div>)}
                    {getCalendarDays(currentDate).map((day, idx) => {
                        const dayShifts = getShiftsForDay(day);
                        const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                        const isToday = isSameDay(day, new Date());
                        
                        return (
                            <div key={idx} onClick={() => isManager && handleCreateInit(day)} className={`min-h-[100px] bg-white dark:bg-slate-900 p-2 relative group transition-colors ${!isCurrentMonth ? 'bg-slate-50/50 dark:bg-slate-800/50' : 'hover:bg-blue-50 dark:hover:bg-slate-800'}`}>
                                <div className={`text-xs font-bold mb-2 flex justify-between ${isToday ? 'text-ams-blue' : 'text-slate-700 dark:text-slate-300'} ${!isCurrentMonth ? 'opacity-50' : ''}`}>
                                    <span className={isToday ? 'bg-ams-blue text-white px-1.5 rounded-full' : ''}>{day.getDate()}</span>
                                    {isManager && <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 cursor-pointer text-slate-400 hover:text-ams-blue" />}
                                </div>
                                <div className="space-y-1">
                                    {dayShifts.map(shift => (
                                        <div key={shift.id} onClick={(e) => handleShiftClick(shift, e)} className={`text-[10px] p-1.5 rounded border-l-2 cursor-pointer truncate shadow-sm transition-all hover:scale-[1.02] ${getShiftColor(shift)}`}>
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
                <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-700 rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700 min-h-[150px]">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <div key={day} className="bg-slate-50 dark:bg-slate-800 p-2 text-center text-xs font-bold text-slate-500 uppercase">{day}</div>)}
                    {(() => {
                        const start = getStartOfWeek(currentDate);
                        const days = Array.from({length: 7}, (_, i) => {
                            const d = new Date(start);
                            d.setDate(start.getDate() + i);
                            return d;
                        });
                        
                        return days.map((day, idx) => {
                            const dayShifts = getShiftsForDay(day);
                            const isToday = isSameDay(day, new Date());
                            
                            return (
                                <div key={idx} onClick={() => isManager && handleCreateInit(day)} className="bg-white dark:bg-slate-900 p-2 relative group min-h-[70px] transition-colors hover:bg-blue-50 dark:hover:bg-slate-800">
                                    <div className={`text-xs font-bold mb-2 flex justify-between ${isToday ? 'text-ams-blue' : 'text-slate-700 dark:text-slate-300'}`}>
                                        <span className={isToday ? 'bg-ams-blue text-white px-1.5 rounded-full' : ''}>{day.getDate()}</span>
                                        {isManager && <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 cursor-pointer text-slate-400 hover:text-ams-blue" />}
                                    </div>
                                    <div className="space-y-1">
                                        {dayShifts.map(shift => (
                                            <div key={shift.id} onClick={(e) => handleShiftClick(shift, e)} className={`text-[10px] p-2 rounded border-l-2 cursor-pointer shadow-sm transition-all hover:scale-[1.02] ${getShiftColor(shift)}`}>
                                                <div className="font-bold truncate">{shift.location}</div>
                                                <div className="flex items-center gap-1 opacity-80">
                                                    <Clock className="w-3 h-3" />
                                                    {shift.start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - {shift.end.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                                </div>
                                                {shift.slots.length > 0 && (
                                                    <div className="mt-1 flex -space-x-1">
                                                        {shift.slots.map((s, i) => (
                                                            <div key={i} className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white ring-1 ring-white ${s.userId ? 'bg-ams-blue' : 'bg-slate-300'}`}>
                                                                {s.userName ? s.userName.charAt(0) : '?'}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        });
                    })()}
                </div>
            )}

            {viewMode === 'List' && (
                <div className="space-y-2">
                    {filteredShifts.filter(s => s.end >= new Date()).length === 0 ? (
                        <div className="text-center p-8 text-slate-400 italic">No upcoming shifts found matching your filter.</div>
                    ) : (
                        filteredShifts.filter(s => s.end >= new Date()).map(shift => (
                            <div key={shift.id} onClick={(e) => handleShiftClick(shift, e)} className={`flex items-center p-4 bg-white dark:bg-slate-800 rounded-xl border-l-4 shadow-sm hover:shadow-md transition-all cursor-pointer ${getShiftColor(shift)}`}>
                                <div className="flex flex-col items-center mr-4 min-w-[60px]">
                                    <span className="text-xs font-bold uppercase text-slate-500">{shift.start.toLocaleDateString('en-GB', {weekday: 'short'})}</span>
                                    <span className="text-xl font-bold text-slate-800 dark:text-white">{shift.start.getDate()}</span>
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-bold text-slate-800 dark:text-white text-lg">{shift.location}</h4>
                                        <span className="text-xs font-mono bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300">
                                            {shift.start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - {shift.end.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-600 dark:text-slate-400">
                                        {shift.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {shift.address.split('|')[1] || 'Map Location'}</span>}
                                        <div className="flex items-center gap-2">
                                            <Users className="w-3 h-3" />
                                            {shift.slots.map((s, i) => (
                                                <span key={i} className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.userId ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'}`}>
                                                    {s.role}: {s.userName || 'Open'}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Timesheet View */}
            {viewMode === 'Timesheet' && isManager && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 animate-in fade-in">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2"><DollarSign className="w-5 h-5 text-green-600" /> Pay & Hours Calculation</h3>
                        <button onClick={() => setShowPayrollModal(true)} className="px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200">Edit Role Rates</button>
                    </div>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 font-bold uppercase text-xs text-slate-500">
                            <tr>
                                <th className="px-4 py-3">Staff Name</th>
                                <th className="px-4 py-3">Role</th>
                                <th className="px-4 py-3 text-center">Shifts Worked</th>
                                <th className="px-4 py-3 text-center">Total Hours</th>
                                <th className="px-4 py-3 text-right">Role Rate</th>
                                <th className="px-4 py-3 text-right">Est. Pay</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {calculateTimesheet().map((row, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">{row.name}</td>
                                    <td className="px-4 py-3 text-xs">
                                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">{row.role}</span>
                                    </td>
                                    <td className="px-4 py-3 text-center">{row.shifts}</td>
                                    <td className="px-4 py-3 text-center font-mono">{row.hours.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-right text-slate-500">£{row.rate}/hr</td>
                                    <td className="px-4 py-3 text-right font-bold text-green-600">£{(row.hours * row.rate).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
          </>
      )}

      {/* Briefing Modal (Non-Manager View) */}
      {isBriefingOpen && selectedShift && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in duration-200">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700 overflow-hidden max-h-[90vh] flex flex-col">
                  <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
                      <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                          <Briefcase className="w-5 h-5 text-ams-blue" /> Shift Briefing
                      </h3>
                      <button onClick={() => setIsBriefingOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
                  </div>
                  <div className="overflow-y-auto flex-1 p-6 space-y-6">
                      <div>
                          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">{selectedShift.location}</h2>
                          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
                              <CalendarIcon className="w-4 h-4" />
                              {selectedShift.start.toLocaleDateString()}
                              <span className="mx-1">•</span>
                              <Clock className="w-4 h-4" />
                              {selectedShift.start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - {selectedShift.end.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                          </div>
                      </div>

                      {/* Map Display for Staff */}
                      {(selectedShift.address || selectedShift.location) && (
                          <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 relative h-48">
                              <LeafletMap 
                                  height="100%" 
                                  markers={(() => {
                                      const coords = getShiftCoordinates(selectedShift.address);
                                      return coords ? [{ id: 'site-loc', lat: coords.lat, lng: coords.lng, color: '#EF4444' }] : [];
                                  })()}
                                  center={(() => {
                                      const coords = getShiftCoordinates(selectedShift.address);
                                      return coords ? [coords.lat, coords.lng] : [51.505, -0.09];
                                  })()}
                                  zoom={getShiftCoordinates(selectedShift.address) ? 15 : 13}
                              />
                              <button 
                                onClick={openDirections}
                                className="absolute bottom-2 right-2 bg-white dark:bg-slate-800 shadow-lg px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 z-[400] text-ams-blue hover:bg-slate-50"
                              >
                                  <Navigation className="w-3 h-3" /> Get Directions
                              </button>
                          </div>
                      )}

                      {selectedShift.address && (
                          <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start gap-3">
                              <MapPin className="w-5 h-5 text-red-500 mt-0.5" />
                              <div>
                                  <p className="text-xs font-bold text-slate-500 uppercase">Site Address</p>
                                  <p className="text-sm dark:text-white">{selectedShift.address.split('|')[1] || selectedShift.address}</p>
                              </div>
                          </div>
                      )}

                      {/* Crew List / Bidding */}
                      <div>
                          <h4 className="font-bold text-sm text-slate-800 dark:text-white mb-3">Crew & Team</h4>
                          <div className="space-y-2">
                              {selectedShift.slots.map((slot, i) => (
                                  <div key={i} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                                      <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                                              {slot.userName ? slot.userName.charAt(0) : '?'}
                                          </div>
                                          <div>
                                              <p className="text-sm font-bold text-slate-800 dark:text-white">{slot.userName || 'Unassigned'}</p>
                                              <p className="text-xs text-slate-500">{slot.role}</p>
                                          </div>
                                      </div>
                                      
                                      {/* Bidding Button */}
                                      {!slot.userId && user && !slot.bids?.some(b => b.userId === user.uid) && canPerformRole(user.role, slot.role) && (
                                          <button 
                                            onClick={() => handleBid(slot.id)}
                                            className="px-3 py-1.5 bg-ams-blue text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors"
                                          >
                                              Request Shift
                                          </button>
                                      )}
                                      {!slot.userId && slot.bids?.some(b => b.userId === user?.uid) && (
                                          <span className="text-xs text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded">Request Pending</span>
                                      )}
                                  </div>
                              ))}
                          </div>
                      </div>

                      {/* Resources */}
                      {selectedShift.resources && selectedShift.resources.length > 0 && (
                          <div>
                              <h4 className="font-bold text-sm text-slate-800 dark:text-white mb-3">Assigned Assets</h4>
                              <div className="flex flex-wrap gap-2">
                                  {selectedShift.resources.map((res, i) => (
                                      <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-xs font-bold rounded-full border border-blue-100 dark:border-blue-800 flex items-center gap-1">
                                          {res.type === 'Vehicle' ? <Truck className="w-3 h-3" /> : <Briefcase className="w-3 h-3" />}
                                          {res.name}
                                      </span>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
                      <button onClick={() => setIsBriefingOpen(false)} className="w-full py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">
                          Close Briefing
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Shift Editor Modal */}
      {isEditorOpen && formData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in duration-200">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700">
                  <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                      <h3 className="font-bold text-lg text-slate-800 dark:text-white">{isNewShift ? 'Create Shift' : 'Edit Shift'}</h3>
                      <button onClick={() => setIsEditorOpen(false)}><X className="w-6 h-6 text-slate-400" /></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Left Column: Details */}
                          <div className="space-y-4">
                              <div>
                                  <label className="input-label">Shift Title</label>
                                  <input className="input-field py-1.5 text-sm h-9" value={formData.location || ''} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="e.g. Night Shift - Alpha" />
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                  <div>
                                      <label className="input-label">Start</label>
                                      <input type="datetime-local" className="input-field py-1.5 text-sm h-9" value={formData.start ? new Date(formData.start.getTime() - (formData.start.getTimezoneOffset() * 60000)).toISOString().slice(0,16) : ''} onChange={e => setFormData({...formData, start: new Date(e.target.value)})} />
                                  </div>
                                  <div>
                                      <label className="input-label">End</label>
                                      <input type="datetime-local" className="input-field py-1.5 text-sm h-9" value={formData.end ? new Date(formData.end.getTime() - (formData.end.getTimezoneOffset() * 60000)).toISOString().slice(0,16) : ''} onChange={e => setFormData({...formData, end: new Date(e.target.value)})} />
                                  </div>
                              </div>

                              {/* Address / Map Section */}
                              <div>
                                  <label className="input-label flex justify-between">
                                      Location / Address
                                      <button type="button" onClick={() => setShowAddressPicker(!showAddressPicker)} className="text-xs text-ams-blue font-bold flex items-center gap-1 hover:underline">
                                          <Map className="w-3 h-3" /> {showAddressPicker ? 'Hide Map' : 'Pick on Map'}
                                      </button>
                                  </label>
                                  <div className="relative">
                                      {/* Integrated Autocomplete */}
                                      <AddressAutocomplete 
                                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-8 py-1.5 text-sm h-9 outline-none focus:ring-2 focus:ring-ams-blue dark:text-white shadow-sm"
                                          placeholder="Search address or coords (lat,lng)..."
                                          value={formData.address ? formData.address.split('|')[1] || formData.address : ''}
                                          onChange={(val) => {
                                              const currentCoords = formData.address?.includes('|') ? formData.address.split('|')[0] : '';
                                              
                                              // Detect manual coordinate entry
                                              if (/^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(val)) {
                                                   setFormData({...formData, address: val});
                                                   if (!showAddressPicker) setShowAddressPicker(true);
                                              } else {
                                                   // Keep existing coords if editing text label
                                                   setFormData({...formData, address: currentCoords ? `${currentCoords}|${val}` : val});
                                              }
                                          }}
                                          onSelect={(addr, lat, lng) => {
                                              setFormData({...formData, address: `${lat},${lng}|${addr}`});
                                              if (!showAddressPicker) setShowAddressPicker(true);
                                          }}
                                      />
                                      <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                                      {/* Clear Button */}
                                      {formData.address && (
                                          <button 
                                            type="button"
                                            onClick={() => setFormData({...formData, address: ''})}
                                            className="absolute right-2 top-2 text-slate-400 hover:text-red-500 transition-colors"
                                          >
                                              <X className="w-4 h-4" />
                                          </button>
                                      )}
                                  </div>
                                  {showAddressPicker && (
                                      <div className="mt-2 h-48 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                                          <LeafletMap 
                                              interactive 
                                              height="100%" 
                                              center={editorCoords ? [editorCoords.lat, editorCoords.lng] : undefined}
                                              markers={editorCoords ? [{
                                                  id: 'selected-loc',
                                                  lat: editorCoords.lat,
                                                  lng: editorCoords.lng,
                                                  label: 'Selected Location'
                                              }] : []}
                                              onLocationSelect={(lat, lng, addr) => setFormData({...formData, address: `${lat},${lng}|${addr || ''}`})} 
                                          />
                                      </div>
                                  )}
                              </div>

                              {/* Repeat Logic */}
                              {isNewShift && (
                                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                                      <label className="flex items-center gap-2 text-sm font-bold text-blue-800 dark:text-blue-300 mb-2 cursor-pointer">
                                          <input type="checkbox" checked={isRepeating} onChange={e => setIsRepeating(e.target.checked)} className="w-4 h-4 rounded" /> Repeat Shift?
                                      </label>
                                      {isRepeating && (
                                          <div className="flex gap-2 animate-in fade-in">
                                              <select className="input-field text-xs py-1 h-8" value={repeatFreq} onChange={e => setRepeatFreq(e.target.value as any)}>
                                                  <option>Daily</option>
                                                  <option>Weekly</option>
                                              </select>
                                              <input 
                                                  type="date" 
                                                  className="input-field text-xs py-1 h-8" 
                                                  placeholder="Repeat Until" 
                                                  value={repeatUntil} 
                                                  onChange={e => setRepeatUntil(e.target.value)} 
                                              />
                                          </div>
                                      )}
                                  </div>
                              )}
                          </div>

                          {/* Right Column: Resources & Staff */}
                          <div className="space-y-6">
                              {/* Asset Assignment */}
                              <div>
                                  <label className="input-label">Assign Assets</label>
                                  <div className="grid grid-cols-2 gap-2 mb-2">
                                      <select className="input-field py-1.5 text-xs h-9" onChange={(e) => { addResource('Vehicle', e.target.value); e.target.value = ''; }}>
                                          <option value="">+ Add Vehicle</option>
                                          {allVehicles.filter(v => !formData.resources?.some(r => r.id === v.id)).map(v => <option key={v.id} value={v.id}>{v.callSign}</option>)}
                                      </select>
                                      <select className="input-field py-1.5 text-xs h-9" onChange={(e) => { addResource('Kit', e.target.value); e.target.value = ''; }}>
                                          <option value="">+ Add Kit</option>
                                          {allKits.filter(k => !formData.resources?.some(r => r.id === k.id)).map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                                      </select>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                      {formData.resources?.map(res => (
                                          <span key={res.id} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs font-bold border border-slate-200 dark:border-slate-600">
                                              {res.type === 'Vehicle' ? <Truck className="w-3 h-3" /> : <Briefcase className="w-3 h-3" />}
                                              {res.name}
                                              <button onClick={() => removeResource(res.id)} className="ml-1 text-slate-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                                          </span>
                                      ))}
                                  </div>
                              </div>

                              {/* Staffing Slots */}
                              <div className="space-y-2">
                                  <div className="flex justify-between items-center">
                                      <h4 className="font-bold text-sm dark:text-white">Staffing</h4>
                                      <button onClick={addSlot} className="text-xs bg-ams-blue text-white px-2 py-1 rounded">+ Slot</button>
                                  </div>
                                  {formSlots.map((slot, idx) => (
                                      <div key={idx} className="p-3 border rounded-lg bg-slate-50 dark:bg-slate-900 dark:border-slate-700 relative">
                                          <div className="flex justify-between mb-2">
                                              <select className="text-xs p-1 rounded border bg-white dark:bg-slate-700 dark:text-white" value={slot.role} onChange={e => updateSlot(idx, 'role', e.target.value)}>{Object.values(Role).map(r => <option key={r}>{r}</option>)}</select>
                                              <button onClick={() => removeSlot(idx)} className="text-red-500"><Trash2 className="w-4 h-4" /></button>
                                          </div>
                                          <select 
                                            className="w-full text-xs p-2 rounded border bg-white dark:bg-slate-700 dark:text-white h-9" 
                                            value={slot.userId || ''} 
                                            onChange={e => updateSlot(idx, 'userId', e.target.value)}
                                          >
                                              <option value="">-- Unassigned --</option>
                                              {allStaff.map(s => {
                                                  const unavail = formData.start && formData.end ? getUnavailability(s.uid, new Date(formData.start), new Date(formData.end)) : null;
                                                  return (
                                                      <option key={s.uid} value={s.uid} disabled={!!unavail} className={unavail ? 'text-red-400' : ''}>
                                                          {s.name} ({s.role}) {unavail ? `[UNAVAILABLE: ${unavail.type}]` : ''}
                                                      </option>
                                                  );
                                              })}
                                          </select>
                                          
                                          {/* Bids Display for Manager */}
                                          {slot.bids && slot.bids.length > 0 && !slot.userId && (
                                              <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                                                  <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">Pending Requests</p>
                                                  {slot.bids.map((bid, bIdx) => {
                                                      const unavail = formData.start && formData.end ? getUnavailability(bid.userId, new Date(formData.start), new Date(formData.end)) : null;
                                                      return (
                                                          <div key={bIdx} className="flex justify-between items-center text-xs bg-amber-50 dark:bg-amber-900/20 p-1.5 rounded mb-1 border border-amber-100 dark:border-amber-800">
                                                              <span className={unavail ? 'text-red-500 line-through' : 'text-slate-800 dark:text-slate-200'}>{bid.userName} ({bid.userRole})</span>
                                                              <button 
                                                                onClick={() => updateSlot(idx, 'userId', bid.userId)}
                                                                disabled={!!unavail}
                                                                className={`px-2 py-0.5 rounded font-bold text-[10px] ${unavail ? 'bg-slate-200 text-slate-500' : 'bg-amber-200 text-amber-800 hover:bg-amber-300'}`}
                                                              >
                                                                  {unavail ? 'Unavail' : 'Accept'}
                                                              </button>
                                                          </div>
                                                      );
                                                  })}
                                              </div>
                                          )}
                                      </div>
                                  ))}
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-end gap-2">
                      {!isNewShift && (
                          <>
                            <button onClick={handleDeleteShift} className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-bold rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center gap-2 mr-auto" title="Delete Shift">
                                <Trash2 className="w-4 h-4" />
                            </button>
                            {selectedShift?.status !== 'Cancelled' && (
                                <button onClick={handleCancelShift} className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors flex items-center gap-2" title="Cancel Shift">
                                    <Ban className="w-4 h-4" /> Cancel
                                </button>
                            )}
                          </>
                      )}
                      <button onClick={() => setIsEditorOpen(false)} className="px-6 py-2 text-slate-500 font-bold hover:bg-slate-200 rounded-lg">Close</button>
                      <button onClick={handleSaveShift} className="px-8 py-2 bg-ams-blue text-white font-bold rounded-lg hover:bg-blue-700">Save</button>
                  </div>
              </div>
          </div>
      )}

      {/* Availability Modal */}
      {showAvailabilityModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in duration-200">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                      <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                          <Palmtree className="w-5 h-5 text-ams-blue" /> Manage Availability
                      </h3>
                      <button onClick={() => setShowAvailabilityModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
                  </div>
                  
                  <div className="p-6 space-y-6">
                      <div className="space-y-4">
                          <h4 className="text-sm font-bold text-slate-500 uppercase">Add Unavailability</h4>
                          <div className="grid grid-cols-2 gap-3">
                              <div>
                                  <label className="input-label">Start Date</label>
                                  <input type="date" className="input-field py-1.5 text-sm" value={unavailForm.start} onChange={e => setUnavailForm({...unavailForm, start: e.target.value})} />
                              </div>
                              <div>
                                  <label className="input-label">End Date</label>
                                  <input type="date" className="input-field py-1.5 text-sm" value={unavailForm.end} onChange={e => setUnavailForm({...unavailForm, end: e.target.value})} />
                              </div>
                          </div>
                          <div>
                              <label className="input-label">Type</label>
                              <select className="input-field py-1.5 text-sm" value={unavailForm.type} onChange={e => setUnavailForm({...unavailForm, type: e.target.value as any})}>
                                  <option>Holiday</option>
                                  <option>Sick</option>
                                  <option>Other</option>
                              </select>
                          </div>
                          <div>
                              <label className="input-label">Reason (Optional)</label>
                              <input className="input-field py-1.5 text-sm" placeholder="e.g. Annual Leave" value={unavailForm.reason} onChange={e => setUnavailForm({...unavailForm, reason: e.target.value})} />
                          </div>
                          <button onClick={handleAddUnavailability} disabled={!unavailForm.start || !unavailForm.end} className="w-full py-2 bg-ams-blue text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-md">
                              Log Unavailability
                          </button>
                      </div>

                      <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                          <h4 className="text-sm font-bold text-slate-500 uppercase mb-3">Upcoming Unavailability</h4>
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                              {myUnavailability.length === 0 && <p className="text-sm text-slate-400 italic">No records found.</p>}
                              {myUnavailability.map(u => (
                                  <div key={u.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                                      <div>
                                          <div className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                                              {u.type}
                                              {u.reason && <span className="text-[10px] font-normal text-slate-500 bg-white dark:bg-slate-800 px-1.5 rounded border border-slate-200 dark:border-slate-700">{u.reason}</span>}
                                          </div>
                                          <div className="text-xs text-slate-500">{new Date(u.start).toLocaleDateString()} - {new Date(u.end).toLocaleDateString()}</div>
                                      </div>
                                      <button onClick={() => handleDeleteUnavailability(u.id)} className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Payroll Settings Modal */}
      {showPayrollModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in duration-200">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                  <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                      <h3 className="font-bold text-lg text-slate-800 dark:text-white">Role Pay Rates</h3>
                      <button onClick={() => setShowPayrollModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
                  </div>
                  <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                      {Object.values(Role).map(role => (
                          <div key={role} className="flex justify-between items-center">
                              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{role}</span>
                              <div className="flex items-center gap-2">
                                  <span className="text-slate-400 text-sm">£</span>
                                  <input 
                                      type="number" 
                                      className="w-20 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-mono text-right"
                                      value={roleRates[role] || 0}
                                      onChange={e => setRoleRates({ ...roleRates, [role]: Number(e.target.value) })}
                                  />
                                  <span className="text-slate-400 text-xs">/hr</span>
                              </div>
                          </div>
                      ))}
                  </div>
                  <div className="p-5 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                      <button onClick={handleSaveRates} className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors">
                          Save Rates
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default RotaPage;
