
import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, MapPin, Clock, CheckCircle, 
  Calendar as CalendarIcon, Filter, Plus, X, Repeat, Loader2, 
  Briefcase, Truck, Users, Download, Bookmark, Search,
  Trash2, Tag, UserMinus, AlertCircle, Palette, Sparkles
} from 'lucide-react';
import { Shift, Role, ShiftBid, User, ShiftTemplate } from '../types';
import { useAuth } from '../hooks/useAuth';
import { getRoleColor, canPerformRole } from '../utils/roleHelper';
import { db } from '../services/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, orderBy, Timestamp, arrayUnion, arrayRemove, getDocs, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { analyzeRotaCoverage } from '../services/geminiService';

// --- Colors for Shifts ---
const SHIFT_COLORS = {
    'Blue': 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-900/20 hover:bg-blue-50 dark:hover:bg-blue-900/30',
    'Green': 'border-l-green-500 bg-green-50/50 dark:bg-green-900/20 hover:bg-green-50 dark:hover:bg-green-900/30',
    'Red': 'border-l-red-500 bg-red-50/50 dark:bg-red-900/20 hover:bg-red-50 dark:hover:bg-red-900/30',
    'Purple': 'border-l-purple-500 bg-purple-50/50 dark:bg-purple-900/20 hover:bg-purple-50 dark:hover:bg-purple-900/30',
    'Amber': 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-900/20 hover:bg-amber-50 dark:hover:bg-amber-900/30',
};

const COLOR_OPTIONS = [
    { name: 'Standard (Blue)', value: 'Blue', class: 'bg-blue-500' },
    { name: 'Training (Green)', value: 'Green', class: 'bg-green-500' },
    { name: 'Critical (Red)', value: 'Red', class: 'bg-red-500' },
    { name: 'Event (Purple)', value: 'Purple', class: 'bg-purple-500' },
    { name: 'Resilience (Amber)', value: 'Amber', class: 'bg-amber-500' },
];

const ShiftCard: React.FC<{ shift: Shift; user: User | null; onSelect: (shift: Shift) => void }> = ({ shift, user, onSelect }) => {
    const isAssigned = shift.assignedUserIds.includes(user?.uid || '');
    const isFull = shift.status === 'Filled' || shift.status === 'Completed';
    const isBid = shift.bids.some(b => b.userId === user?.uid);
    
    // Determine Style
    const baseStyle = shift.color && SHIFT_COLORS[shift.color as keyof typeof SHIFT_COLORS] 
        ? SHIFT_COLORS[shift.color as keyof typeof SHIFT_COLORS] 
        : 'border-l-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700';

    return (
        <div 
          onClick={() => onSelect(shift)}
          className={`p-4 rounded-xl border-t border-r border-b border-l-[6px] text-left relative transition-all cursor-pointer group shadow-sm hover:shadow-md dark:border-slate-700 ${baseStyle} ${
              isAssigned ? 'ring-1 ring-green-200 dark:ring-green-700' : ''
          }`}
        >
            <div className="flex justify-between items-start mb-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                    shift.status === 'Open' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 
                    shift.status === 'Filled' ? 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300' : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                }`}>
                    {shift.status}
                </span>
                {isAssigned && <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />}
                {!isAssigned && isBid && <Clock className="w-4 h-4 text-blue-500 dark:text-blue-400" />}
            </div>
            
            <div className="flex items-center gap-1.5 text-slate-800 dark:text-white mb-1">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-bold font-mono">
                    {shift.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {shift.end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
            </div>
            
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-3">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-medium truncate">{shift.location}</span>
            </div>

            {shift.tags && shift.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                    {shift.tags.map(tag => (
                        <span key={tag} className="text-[9px] px-2 py-0.5 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full border border-slate-200 dark:border-slate-600 font-bold uppercase shadow-sm">
                            {tag}
                        </span>
                    ))}
                </div>
            )}

            <div className="flex flex-wrap gap-1 mt-auto">
                {shift.requiredRole.map((role, i) => (
                    <span key={i} className={`text-[10px] px-2 py-0.5 rounded-md border font-medium ${getRoleColor(role)}`}>
                        {role}
                    </span>
                ))}
            </div>
        </div>
    );
};

const RotaPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // -- View State --
  const [viewMode, setViewMode] = useState<'Month' | 'Week' | 'List'>('List');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // -- Data State --
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // -- Filters --
  const [filterRole, setFilterRole] = useState<string>('All');
  const [filterLocation, setFilterLocation] = useState<string>('');
  const [showMyShiftsOnly, setShowMyShiftsOnly] = useState(false);
  
  // -- Modal State --
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [showBriefingModal, setShowBriefingModal] = useState(false);
  const [teamMembers, setTeamMembers] = useState<User[]>([]); 
  
  // -- AI Insight State --
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);

  // -- Create Shift Form State --
  const [newShift, setNewShift] = useState({
    date: new Date().toISOString().split('T')[0],
    startTime: '07:00',
    endTime: '19:00',
    location: '',
    role: Role.Paramedic,
    slots: 1,
    vehicleId: '',
    notes: '',
    repeats: 'None',
    color: 'Blue',
    tags: ''
  });
  const [templateName, setTemplateName] = useState('');

  const isManager = user?.role === Role.Manager || user?.role === Role.Admin;

  useEffect(() => {
    let startRange = new Date(currentDate);
    let endRange = new Date(currentDate);

    if (viewMode === 'Month') {
        startRange.setDate(1);
        endRange.setMonth(endRange.getMonth() + 1);
        endRange.setDate(0);
    } else if (viewMode === 'Week') {
        const day = startRange.getDay();
        const diff = startRange.getDate() - day + (day === 0 ? -6 : 1); 
        startRange.setDate(diff);
        startRange.setHours(0,0,0,0);
        
        endRange = new Date(startRange);
        endRange.setDate(startRange.getDate() + 7);
    } else {
        startRange.setHours(0,0,0,0);
        endRange.setDate(endRange.getDate() + 60); 
    }

    const q = query(
        collection(db, 'shifts'),
        where('start', '>=', Timestamp.fromDate(startRange)),
        where('start', '<=', Timestamp.fromDate(endRange)),
        orderBy('start', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedShifts: Shift[] = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                start: data.start.toDate(),
                end: data.end.toDate(),
                bids: data.bids || []
            } as Shift;
        });
        setShifts(fetchedShifts);
        setIsLoading(false);
    });
    
    if (isManager) {
        getDocs(collection(db, 'shift_templates')).then(snap => {
            setTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() } as ShiftTemplate)));
        });
    }

    return () => unsubscribe();
  }, [currentDate, viewMode, isManager]);

  const activeShift = shifts.find(s => s.id === selectedShiftId) || null;

  useEffect(() => {
      if (selectedShiftId && !activeShift) {
          setShowBriefingModal(false);
          setSelectedShiftId(null);
      }
  }, [activeShift, selectedShiftId]);

  const fetchTeamMembers = async (shift: Shift) => {
      if (shift.assignedUserIds.length === 0) {
          setTeamMembers([]);
          return;
      }
      try {
          const members: User[] = [];
          for (const uid of shift.assignedUserIds) {
              const uDoc = await getDoc(doc(db, 'users', uid));
              if (uDoc.exists()) members.push(uDoc.data() as User);
          }
          setTeamMembers(members);
      } catch (e) {
          console.error("Error fetching team", e);
      }
  };

  const handleOpenBriefing = (shift: Shift) => {
      setSelectedShiftId(shift.id);
      fetchTeamMembers(shift);
      setShowBriefingModal(true);
  };

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (templateName) {
        await addDoc(collection(db, 'shift_templates'), {
            name: templateName,
            startTime: newShift.startTime,
            endTime: newShift.endTime,
            location: newShift.location,
            role: newShift.role,
            slots: newShift.slots,
            notes: newShift.notes
        });
    }
    
    const shiftsToCreate: any[] = [];
    const baseDate = new Date(newShift.date);
    const [startH, startM] = newShift.startTime.split(':').map(Number);
    const [endH, endM] = newShift.endTime.split(':').map(Number);
    const tagsArray = newShift.tags.split(',').map(t => t.trim()).filter(t => t !== '');
    
    let iterations = 1;
    let daysToAdd = 0;

    switch(newShift.repeats) {
        case 'Daily for 1 Week': iterations = 7; daysToAdd = 1; break;
        case 'Weekly for 1 Month': iterations = 4; daysToAdd = 7; break;
        default: iterations = 1;
    }

    try {
        for (let i = 0; i < iterations; i++) {
            const shiftDate = new Date(baseDate);
            shiftDate.setDate(baseDate.getDate() + (i * daysToAdd));
            
            const start = new Date(shiftDate);
            start.setHours(startH, startM);
            const end = new Date(shiftDate);
            end.setHours(endH, endM);
            if (end < start) end.setDate(end.getDate() + 1);

            const shiftPayload = {
                start: Timestamp.fromDate(start),
                end: Timestamp.fromDate(end),
                location: newShift.location,
                requiredRole: Array(newShift.slots).fill(newShift.role),
                assignedUserIds: [],
                bids: [],
                status: 'Open',
                vehicleId: newShift.vehicleId.toUpperCase(),
                notes: newShift.notes,
                createdBy: user.uid,
                createdAt: Timestamp.now(),
                color: newShift.color,
                tags: tagsArray
            };
            shiftsToCreate.push(shiftPayload);
        }

        await Promise.all(shiftsToCreate.map(s => addDoc(collection(db, 'shifts'), s)));
        setShowCreateModal(false);
        setTemplateName('');
        setNewShift(prev => ({ ...prev, notes: '', vehicleId: '', tags: '' }));
    } catch (error) {
        console.error("Error creating shifts", error);
        alert("Failed to publish shifts");
    }
  };

  const handleBid = async (shift: Shift) => {
      if (!user) return;
      const bid: ShiftBid = {
          userId: user.uid,
          userName: user.name,
          userRole: user.role,
          timestamp: new Date().toISOString()
      };
      await updateDoc(doc(db, 'shifts', shift.id), {
          bids: arrayUnion(bid)
      });
  };

  const handleAssign = async (shift: Shift, userId: string) => {
      const updatedAssignments = [...shift.assignedUserIds, userId];
      const isFilled = updatedAssignments.length >= shift.requiredRole.length;
      const bidToRemove = shift.bids.find(b => b.userId === userId);

      await updateDoc(doc(db, 'shifts', shift.id), {
          assignedUserIds: updatedAssignments,
          bids: arrayRemove(bidToRemove),
          status: isFilled ? 'Filled' : 'Open'
      });
      fetchTeamMembers({ ...shift, assignedUserIds: updatedAssignments });
      setAiInsight(null); // Clear AI suggestion as rota changed
  };

  const handleUnassign = async (shift: Shift, userId: string) => {
      if (!confirm("Remove this user from the shift?")) return;
      try {
          await updateDoc(doc(db, 'shifts', shift.id), {
              assignedUserIds: arrayRemove(userId),
              status: 'Open'
          });
          const updatedAssignments = shift.assignedUserIds.filter(id => id !== userId);
          fetchTeamMembers({ ...shift, assignedUserIds: updatedAssignments });
      } catch (error) {
          console.error("Error unassigning", error);
      }
  };

  const handleDeleteShift = async () => {
      if (!activeShift) return;
      if (!confirm("Are you sure you want to CANCEL this shift? This cannot be undone.")) return;
      try {
          await deleteDoc(doc(db, 'shifts', activeShift.id));
          setShowBriefingModal(false);
      } catch (error) {
          console.error("Error deleting", error);
          alert("Failed to delete shift.");
      }
  };

  const applyTemplate = (t: ShiftTemplate) => {
      setNewShift({
          ...newShift,
          startTime: t.startTime,
          endTime: t.endTime,
          location: t.location,
          role: t.role,
          slots: t.slots,
          notes: t.notes
      });
  };

  const handleDateNav = (dir: 'prev' | 'next') => {
      const newDate = new Date(currentDate);
      if (viewMode === 'Month') newDate.setMonth(newDate.getMonth() + (dir === 'next' ? 1 : -1));
      else if (viewMode === 'Week') newDate.setDate(newDate.getDate() + (dir === 'next' ? 7 : -7));
      else newDate.setDate(newDate.getDate() + (dir === 'next' ? 1 : -1)); 
      setCurrentDate(newDate);
  };
  
  const downloadICS = () => {
      if (!activeShift) return;
      
      const formatDate = (date: Date) => {
          return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      };
  
      const icsContent = [
          'BEGIN:VCALENDAR',
          'VERSION:2.0',
          'PRODID:-//Aegis Staff Hub//EN',
          'BEGIN:VEVENT',
          `UID:${activeShift.id}@aegis.app`,
          `DTSTAMP:${formatDate(new Date())}`,
          `DTSTART:${formatDate(activeShift.start)}`,
          `DTEND:${formatDate(activeShift.end)}`,
          `SUMMARY:Shift at ${activeShift.location}`,
          `DESCRIPTION:Role: ${activeShift.requiredRole.join(', ')}`,
          `LOCATION:${activeShift.location}`,
          'END:VEVENT',
          'END:VCALENDAR'
      ].join('\r\n');
  
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.setAttribute('download', `shift-${activeShift.start.toISOString().split('T')[0]}.ics`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleAnalyzeRota = async () => {
      setIsAnalyzing(true);
      setAiInsight(null);
      
      const summary = shifts.map(s => `
        Time: ${s.start.toLocaleDateString()} ${s.start.getHours()}:00-${s.end.getHours()}:00. 
        Loc: ${s.location}. 
        Role: ${s.requiredRole}. 
        Status: ${s.status} (${s.assignedUserIds.length} assigned).
      `).join('\n');

      const result = await analyzeRotaCoverage(summary);
      setAiInsight(result);
      setIsAnalyzing(false);
  };

  const filteredShifts = shifts.filter(shift => {
      if (showMyShiftsOnly) {
          return shift.assignedUserIds.includes(user?.uid || '');
      }
      if (filterRole !== 'All' && !shift.requiredRole.includes(filterRole as Role)) return false;
      if (filterLocation && !shift.location.toLowerCase().includes(filterLocation.toLowerCase())) return false;
      return true;
  });

  const myShiftCount = shifts.filter(s => s.assignedUserIds.includes(user?.uid || '')).length;
  const openShiftCount = shifts.filter(s => s.status === 'Open').length;

  return (
    <div className="space-y-6">
      
      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-ams-blue dark:text-blue-400 rounded-xl"><Clock className="w-6 h-6" /></div>
              <div><p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">My Shifts</p><p className="text-3xl font-bold text-slate-800 dark:text-white">{myShiftCount}</p></div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl"><CheckCircle className="w-6 h-6" /></div>
              <div><p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Open Slots</p><p className="text-3xl font-bold text-slate-800 dark:text-white">{openShiftCount}</p></div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4 md:col-span-2 relative overflow-hidden group">
               <div className="p-4 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl relative z-10"><Briefcase className="w-6 h-6" /></div>
               <div className="relative z-10">
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Next Duty</p>
                  <p className="text-lg font-bold truncate text-slate-800 dark:text-white">
                      {shifts.find(s => s.assignedUserIds.includes(user?.uid || '') && s.start > new Date())?.location || 'No upcoming shifts'}
                  </p>
               </div>
               <div className="absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-purple-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
      </div>

      {/* Main Toolbar */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Rota & Scheduling</h1>
            </div>
            
            <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto">
               <div className="flex bg-slate-100 dark:bg-slate-700 p-1.5 rounded-xl">
                  {(['List', 'Week', 'Month'] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => setViewMode(mode)}
                        className={`px-5 py-2 text-xs font-bold rounded-lg transition-all ${viewMode === mode ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                      >
                          {mode}
                      </button>
                  ))}
               </div>
               
               <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700 rounded-xl p-1.5 border border-slate-200 dark:border-slate-600 ml-auto lg:ml-0">
                    <button onClick={() => handleDateNav('prev')} className="p-2 hover:bg-white dark:hover:bg-slate-600 rounded-lg transition-colors"><ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" /></button>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200 min-w-[140px] text-center">
                        {viewMode === 'Month' ? currentDate.toLocaleDateString('en-GB', {month: 'long', year: 'numeric'}) : currentDate.toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'})}
                    </span>
                    <button onClick={() => handleDateNav('next')} className="p-2 hover:bg-white dark:hover:bg-slate-600 rounded-lg transition-colors"><ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" /></button>
               </div>

               {isManager && (
                 <div className="flex gap-2 ml-auto lg:ml-2">
                     <button
                        onClick={handleAnalyzeRota}
                        disabled={isAnalyzing}
                        className="flex items-center gap-2 px-4 py-2.5 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-800 rounded-xl font-bold hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors text-sm disabled:opacity-50"
                     >
                        {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        AI Insight
                     </button>
                     <button 
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-ams-blue text-white rounded-xl font-bold shadow-md hover:bg-blue-900 transition-colors text-sm"
                     >
                        <Plus className="w-4 h-4" /> Add Shifts
                     </button>
                 </div>
               )}
            </div>
        </div>

        {/* AI Rota Analysis Alert */}
        {aiInsight && (
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4 flex items-start gap-3 animate-in slide-in-from-top-2 relative">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg text-purple-600 dark:text-purple-400 mt-0.5"><Sparkles className="w-4 h-4" /></div>
                <div className="flex-1">
                    <h4 className="font-bold text-purple-800 dark:text-purple-300 text-sm mb-1">Rota Analysis</h4>
                    <p className="text-xs text-purple-700 dark:text-purple-400 whitespace-pre-line leading-relaxed">{aiInsight}</p>
                </div>
                <button onClick={() => setAiInsight(null)} className="text-purple-400 hover:text-purple-600"><X className="w-4 h-4" /></button>
            </div>
        )}

        {/* Filters Bar */}
        <div className="flex flex-col md:flex-row gap-4 pt-4 border-t border-slate-100 dark:border-slate-700">
            <div className="flex-1 flex items-center gap-3 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-ams-blue transition-all">
                <Search className="w-4 h-4 text-slate-400" />
                <input 
                    placeholder="Filter by location..." 
                    className="bg-transparent text-sm w-full outline-none font-medium text-slate-700 dark:text-slate-200"
                    value={filterLocation}
                    onChange={e => setFilterLocation(e.target.value)}
                />
            </div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar">
                <select 
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-ams-blue"
                    value={filterRole}
                    onChange={e => setFilterRole(e.target.value)}
                >
                    <option value="All">All Roles</option>
                    {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                
                <button 
                    onClick={() => setShowMyShiftsOnly(!showMyShiftsOnly)}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold border whitespace-nowrap transition-colors flex items-center gap-2 ${showMyShiftsOnly ? 'bg-ams-blue text-white border-ams-blue shadow-md' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                >
                    <Briefcase className="w-4 h-4" /> My Shifts
                </button>
            </div>
        </div>
      </div>

      {isLoading ? (
          <div className="h-64 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-ams-blue" /></div>
      ) : (
        <>
            {/* List View */}
            {viewMode === 'List' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in">
                    {filteredShifts.length === 0 && <div className="col-span-full text-center text-slate-400 py-12">No shifts found matching filters.</div>}
                    {filteredShifts.map(shift => (
                        <ShiftCard key={shift.id} shift={shift} user={user} onSelect={handleOpenBriefing} />
                    ))}
                </div>
            )}

            {/* Week View */}
            {viewMode === 'Week' && (
                <div className="grid grid-cols-7 gap-3 min-h-[500px] animate-in fade-in">
                    {[0,1,2,3,4,5,6].map(offset => {
                        const dayDate = new Date(currentDate);
                        const currentDay = dayDate.getDay(); 
                        const diff = dayDate.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
                        dayDate.setDate(diff + offset);
                        
                        const dayShifts = filteredShifts.filter(s => s.start.getDate() === dayDate.getDate());

                        return (
                            <div key={offset} className="flex flex-col gap-3">
                                <div className={`text-center p-3 rounded-xl border ${dayDate.getDate() === new Date().getDate() ? 'bg-ams-blue text-white border-ams-blue shadow-md' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}>
                                    <div className="text-xs uppercase font-bold opacity-70 mb-1">{dayDate.toLocaleDateString('en-GB', {weekday: 'short'})}</div>
                                    <div className="text-xl font-bold">{dayDate.getDate()}</div>
                                </div>
                                <div className="flex-1 bg-slate-100/50 dark:bg-slate-900/30 rounded-2xl p-2 space-y-3 border border-slate-200/50 dark:border-slate-800">
                                    {dayShifts.map(shift => (
                                        <ShiftCard key={shift.id} shift={shift} user={user} onSelect={handleOpenBriefing} />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Month View - Enhanced Grid */}
            {viewMode === 'Month' && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden animate-in fade-in">
                    <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
                            <div key={d} className="p-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{d}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 auto-rows-[140px] divide-x divide-slate-100 dark:divide-slate-700 divide-y">
                        {Array.from({ length: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate() }, (_, i) => {
                            const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1);
                            const dayShifts = filteredShifts.filter(s => s.start.getDate() === d.getDate());
                            
                            return (
                                <div key={i} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors overflow-y-auto relative group">
                                    <div className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-2 ${
                                        d.getDate() === new Date().getDate() && d.getMonth() === new Date().getMonth() ? 'bg-ams-blue text-white' : 'text-slate-400'
                                    }`}>{i + 1}</div>
                                    
                                    <div className="space-y-1.5">
                                        {dayShifts.map(s => (
                                            <div 
                                                key={s.id} 
                                                onClick={() => handleOpenBriefing(s)}
                                                className={`text-[10px] px-2 py-1.5 rounded-lg truncate cursor-pointer border font-medium flex items-center gap-1 ${
                                                    s.assignedUserIds.includes(user?.uid || '') 
                                                    ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' 
                                                    : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-ams-blue'
                                                }`}
                                            >
                                                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                                    s.status === 'Open' ? 'bg-blue-500' : s.status === 'Filled' ? 'bg-slate-400' : 'bg-green-500'
                                                }`} />
                                                {s.start.getHours()}:00 {s.location}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </>
      )}

      {/* --- Briefing Modal --- */}
      {showBriefingModal && activeShift && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in zoom-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700">
                <div className="bg-slate-900 dark:bg-slate-950 text-white p-8 flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 text-ams-light-blue font-bold text-xs uppercase tracking-widest mb-2">
                            <Briefcase className="w-4 h-4" /> Shift Details
                        </div>
                        <h2 className="text-3xl font-bold">{activeShift.location}</h2>
                        <p className="text-slate-400 mt-1 font-mono">{activeShift.start.toLocaleString()} - {activeShift.end.toLocaleTimeString()}</p>
                    </div>
                    <button onClick={() => setShowBriefingModal(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"><X className="w-6 h-6" /></button>
                </div>

                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
                            <h3 className="font-bold text-slate-800 dark:text-white mb-4 text-xs uppercase tracking-wider">Operational Info</h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-700 pb-2">
                                    <span className="text-slate-500 dark:text-slate-400">Roles Required</span>
                                    <span className="font-medium text-slate-800 dark:text-white">{activeShift.requiredRole.join(', ')}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-700 pb-2">
                                    <span className="text-slate-500 dark:text-slate-400">Vehicle ID</span>
                                    <span className="font-bold text-ams-blue">{activeShift.vehicleId || 'Not Assigned'}</span>
                                </div>
                                {activeShift.tags && activeShift.tags.length > 0 && (
                                     <div className="flex flex-wrap gap-1 py-2">
                                         {activeShift.tags.map(t => (
                                             <span key={t} className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-full font-bold uppercase">{t}</span>
                                         ))}
                                     </div>
                                )}
                                {activeShift.notes && (
                                    <div className="pt-2">
                                        <span className="text-slate-500 dark:text-slate-400 block mb-2 text-xs font-bold uppercase">Notes</span>
                                        <p className="text-slate-700 dark:text-slate-300 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl border border-amber-100 dark:border-amber-800 text-xs leading-relaxed">{activeShift.notes}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {activeShift.assignedUserIds.includes(user?.uid || '') && (
                            <button 
                                onClick={downloadICS}
                                className="w-full py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl flex items-center justify-center gap-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shadow-sm"
                            >
                                <Download className="w-4 h-4" /> Add to Calendar
                            </button>
                        )}
                        
                        {isManager && (
                            <button 
                                onClick={handleDeleteShift}
                                className="w-full py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 font-bold rounded-xl flex items-center justify-center gap-2 text-sm hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" /> Cancel/Delete Shift
                            </button>
                        )}
                    </div>

                    <div className="space-y-6">
                        {/* Team View */}
                        <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-6">
                            <h3 className="font-bold text-slate-800 dark:text-white mb-4 text-xs uppercase tracking-wider flex items-center gap-2"><Users className="w-4 h-4" /> Team Members</h3>
                            {teamMembers.length > 0 ? (
                                <div className="space-y-3">
                                    {teamMembers.map(tm => (
                                        <div key={tm.uid} className="flex items-center justify-between group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                                                    {tm.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800 dark:text-white">{tm.name}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{tm.role}</p>
                                                </div>
                                            </div>
                                            {isManager && (
                                                <button 
                                                    onClick={() => handleUnassign(activeShift, tm.uid)}
                                                    className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                    title="Unassign User"
                                                >
                                                    <UserMinus className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400 italic text-center py-4">No other staff assigned yet.</p>
                            )}
                        </div>

                        {/* Actions */}
                        {activeShift.assignedUserIds.includes(user?.uid || '') ? (
                            <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-2xl border border-green-100 dark:border-green-900 text-center">
                                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600 dark:text-green-400">
                                    <CheckCircle className="w-8 h-8" />
                                </div>
                                <h3 className="font-bold text-green-800 dark:text-green-400 text-lg">Assigned to Shift</h3>
                                <p className="text-green-600/80 dark:text-green-400/80 text-sm mb-4">You are confirmed for this duty.</p>
                                {activeShift.vehicleId && (
                                    <button 
                                        onClick={() => navigate('/assets')}
                                        className="w-full py-3 bg-white dark:bg-slate-800 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 font-bold rounded-xl text-sm hover:bg-green-50 dark:hover:bg-green-900/20 shadow-sm transition-colors"
                                    >
                                        Perform Vehicle Check
                                    </button>
                                )}
                            </div>
                        ) : (
                            activeShift.status === 'Open' && canPerformRole(user!.role, activeShift.requiredRole[0]) ? (
                                activeShift.bids.some(b => b.userId === user?.uid) ? (
                                    <div className="p-6 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 font-bold text-center rounded-2xl border border-blue-100 dark:border-blue-800 flex flex-col items-center justify-center gap-3">
                                        <Clock className="w-8 h-8 opacity-50" />
                                        <span>Bid Pending Approval</span>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => { handleBid(activeShift); }}
                                        className="w-full py-4 bg-ams-blue text-white font-bold rounded-2xl hover:bg-blue-900 shadow-xl shadow-blue-900/20 transition-all active:scale-95"
                                    >
                                        Bid for Shift
                                    </button>
                                )
                            ) : (
                                <div className="p-6 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-center rounded-2xl flex flex-col items-center justify-center gap-3">
                                    <AlertCircle className="w-8 h-8 opacity-50" />
                                    <span>Locked / Ineligible</span>
                                </div>
                            )
                        )}

                        {/* Manager Controls */}
                        {isManager && activeShift.status === 'Open' && activeShift.bids.length > 0 && (
                            <div className="border-t border-slate-200 dark:border-slate-700 pt-6 animate-in slide-in-from-bottom-2">
                                <h4 className="font-bold text-xs uppercase tracking-wider mb-4 text-blue-800 dark:text-blue-400 flex items-center gap-2">
                                    <Clock className="w-4 h-4" /> Pending Bids ({activeShift.bids.length})
                                </h4>
                                <div className="space-y-3">
                                    {activeShift.bids.map(bid => (
                                        <div key={bid.userId} className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl text-sm border border-blue-100 dark:border-blue-800">
                                            <div>
                                                <span className="font-bold text-slate-800 dark:text-white block">{bid.userName}</span>
                                                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{bid.userRole}</span>
                                            </div>
                                            <button 
                                                onClick={() => handleAssign(activeShift, bid.userId)}
                                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
                                            >
                                                Approve
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* --- Modal: Create Shift --- */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in zoom-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 max-w-lg w-full overflow-y-auto max-h-[90vh] border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Create Shifts</h2>
                    <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400"><X className="w-6 h-6" /></button>
                </div>

                <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-3 flex items-center gap-2 tracking-wider"><Bookmark className="w-3 h-3" /> Quick Load Template</h3>
                    <div className="flex flex-wrap gap-2">
                        {templates.map(t => (
                            <button 
                                key={t.id} 
                                onClick={() => applyTemplate(t)}
                                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-ams-blue hover:text-ams-blue text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold transition-all"
                            >
                                {t.name}
                            </button>
                        ))}
                        {templates.length === 0 && <span className="text-xs text-slate-400 italic">No templates saved.</span>}
                    </div>
                </div>
                
                <form onSubmit={handleCreateShift} className="space-y-5">
                    <div>
                        <label className="input-label">Start Date</label>
                        <input type="date" required className="input-field" value={newShift.date} onChange={e => setNewShift({...newShift, date: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="input-label">Start Time</label>
                            <input type="time" required className="input-field" value={newShift.startTime} onChange={e => setNewShift({...newShift, startTime: e.target.value})} />
                        </div>
                        <div>
                            <label className="input-label">End Time</label>
                            <input type="time" required className="input-field" value={newShift.endTime} onChange={e => setNewShift({...newShift, endTime: e.target.value})} />
                        </div>
                    </div>
                    <div>
                        <label className="input-label">Location</label>
                        <input type="text" required className="input-field" value={newShift.location} onChange={e => setNewShift({...newShift, location: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="input-label">Role</label>
                            <select className="input-field" value={newShift.role} onChange={e => setNewShift({...newShift, role: e.target.value as Role})}>
                                {Object.values(Role).map(role => <option key={role} value={role}>{role}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="input-label">Slots</label>
                            <input type="number" min="1" className="input-field" value={newShift.slots} onChange={e => setNewShift({...newShift, slots: Number(e.target.value)})} />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="input-label flex items-center gap-1"><Palette className="w-3 h-3" /> Label Color</label>
                             <div className="flex gap-3 pt-1">
                                 {COLOR_OPTIONS.map(c => (
                                     <button
                                        type="button"
                                        key={c.value}
                                        onClick={() => setNewShift({...newShift, color: c.value})}
                                        className={`w-6 h-6 rounded-full ${c.class} transition-transform ${newShift.color === c.value ? 'scale-125 ring-2 ring-offset-2 ring-slate-400' : 'opacity-60 hover:opacity-100'}`}
                                        title={c.name}
                                     />
                                 ))}
                             </div>
                        </div>
                        <div>
                             <label className="input-label flex items-center gap-1"><Tag className="w-3 h-3" /> Tags</label>
                             <input 
                                className="input-field" 
                                placeholder="e.g. Event, Night"
                                value={newShift.tags}
                                onChange={e => setNewShift({...newShift, tags: e.target.value})}
                             />
                        </div>
                    </div>

                    <div>
                        <label className="input-label">Vehicle ID (Optional)</label>
                        <input type="text" className="input-field" value={newShift.vehicleId} onChange={e => setNewShift({...newShift, vehicleId: e.target.value})} />
                    </div>
                    <div>
                        <label className="input-label">Notes</label>
                        <textarea rows={2} className="input-field resize-none" value={newShift.notes} onChange={e => setNewShift({...newShift, notes: e.target.value})} />
                    </div>
                    
                    <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800">
                        <label className="flex items-center gap-2 mb-3">
                             <input 
                                type="checkbox" 
                                checked={!!templateName}
                                onChange={() => setTemplateName(templateName ? '' : 'New Template')}
                                className="w-4 h-4 text-ams-blue rounded border-slate-300 focus:ring-ams-blue"
                             />
                             <span className="text-sm font-bold text-blue-800 dark:text-blue-300">Save as Template?</span>
                        </label>
                        {templateName && (
                            <input 
                                type="text" 
                                placeholder="Template Name (e.g. Standard Night)"
                                className="w-full bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all dark:text-white"
                                value={templateName === 'New Template' ? '' : templateName}
                                onChange={e => setTemplateName(e.target.value)}
                            />
                        )}
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                        <label className="input-label flex items-center gap-1">
                            <Repeat className="w-3 h-3" /> Recurrence
                        </label>
                        <select className="input-field" value={newShift.repeats} onChange={e => setNewShift({...newShift, repeats: e.target.value})}>
                            <option>None</option>
                            <option>Daily for 1 Week</option>
                            <option>Weekly for 1 Month</option>
                        </select>
                    </div>
                    <button type="submit" className="w-full py-4 bg-ams-blue text-white font-bold rounded-xl hover:bg-blue-900 shadow-lg transition-all active:scale-95 mt-4">
                        Publish Shifts
                    </button>
                </form>
            </div>
        </div>
      )}

      <style>{`
        .input-label { @apply block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5 ml-1; }
        .input-field { @apply w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-ams-blue transition-all dark:text-white; }
      `}</style>
    </div>
  );
};

export default RotaPage;
