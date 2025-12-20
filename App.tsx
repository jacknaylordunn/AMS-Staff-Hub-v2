
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, FileText, Calendar, Truck, AlertTriangle, LogOut,
  Menu, X, Users, Pill, BookOpen, Heart, ChevronRight, ChevronLeft, Sun, Moon, Bell, Check, FolderOpen, PieChart, HelpCircle, RefreshCw
} from 'lucide-react';
import Dashboard from './pages/Dashboard';
import EPRFPage from './pages/EPRFPage';
import RotaPage from './pages/RotaPage';
import AssetPage from './pages/AssetPage';
import LoginPage from './pages/LoginPage';
import MajorIncidentPage from './pages/MajorIncidentPage';
import ProfilePage from './pages/ProfilePage';
import StaffPage from './pages/StaffPage';
import DrugsPage from './pages/DrugsPage';
import CPDPage from './pages/CPDPage';
import WellbeingPage from './pages/WellbeingPage';
import DocumentsPage from './pages/DocumentsPage';
import ClinicalAnalyticsPage from './pages/ClinicalAnalyticsPage';
import CalculatorsPage from './pages/CalculatorsPage';
import GuidelineAssistant from './pages/GuidelineAssistant';
import OfflineIndicator from './components/OfflineIndicator';
import MajorIncidentBanner from './components/MajorIncidentBanner';
import ProtectedRoute from './components/ProtectedRoute';
import HelpModal from './components/HelpModal';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { DataSyncProvider } from './hooks/useDataSync';
import { ThemeProvider, useTheme } from './hooks/useTheme';
import { ToastProvider } from './context/ToastContext';
import { Role, AppNotification, Shift } from './types';
import { db } from './services/firebase';
import { collection, query, orderBy, limit, onSnapshot, updateDoc, doc, where, getDocs, Timestamp } from 'firebase/firestore';
import { requestBrowserPermission, sendBrowserNotification, sendNotification, notifyManagers } from './services/notificationService';

// Use hosted company asset path
const logo = 'https://145955222.fs1.hubspotusercontent-eu1.net/hubfs/145955222/AMS/Logo%20FINAL%20(2).png';

// Define Access Groups
const CLINICAL_ROLES = [Role.Paramedic, Role.Nurse, Role.Doctor, Role.Manager, Role.Admin];

// ... (SidebarItem component omitted, same as original)
interface SidebarItemProps {
  to: string;
  icon: any;
  label: string;
  active: boolean;
  collapsed: boolean;
  onClick?: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ to, icon: Icon, label, active, collapsed, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className={`flex items-center ${collapsed ? 'justify-center px-2' : 'space-x-3 px-4'} py-3 rounded-xl transition-all duration-300 group relative overflow-hidden mb-1 ${
      active 
        ? 'bg-ams-blue text-white shadow-glow' 
        : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800 hover:text-ams-blue dark:hover:text-white'
    }`}
    title={collapsed ? label : undefined}
  >
    <Icon className={`w-5 h-5 relative z-10 ${active ? 'text-white' : 'group-hover:scale-110 transition-transform'}`} />
    {!collapsed && <span className="font-medium relative z-10 text-sm">{label}</span>}
    {!collapsed && active && <ChevronRight className="w-4 h-4 ml-auto relative z-10 opacity-50" />}
  </Link>
);

const ThemeToggle = () => {
    const { theme, toggleTheme } = useTheme();
    return (
        <button 
            onClick={toggleTheme}
            className="p-2.5 rounded-xl hover:bg-white dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-all shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
            title="Toggle Theme"
        >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>
    );
};

const NotificationBell = () => {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [lastNotifiedId, setLastNotifiedId] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;
        requestBrowserPermission();

        // Query: ALL notifications, sorted by newest
        const q = query(
            collection(db, `users/${user.uid}/notifications`), 
            orderBy('timestamp', 'desc'),
            limit(20)
        );

        const unsub = onSnapshot(q, (snap) => {
            const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification));
            setNotifications(items);

            // Browser Notification Logic for new items (only if unseen)
            if (items.length > 0) {
                const latest = items[0];
                if (latest.id !== lastNotifiedId && !latest.read) {
                    sendBrowserNotification(latest.title, latest.message);
                    setLastNotifiedId(latest.id);
                }
            }
        });

        return () => unsub();
    }, [user]);

    const markAsRead = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user) return;
        await updateDoc(doc(db, `users/${user.uid}/notifications`, id), { read: true });
    };

    const markAllRead = async () => {
        if (!user) return;
        // Batch update theoretically better, but simple loop fine for small numbers
        const unread = notifications.filter(n => !n.read);
        unread.forEach(n => markAsRead(n.id, { stopPropagation: () => {} } as any));
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className="relative">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="p-2.5 rounded-xl hover:bg-white dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-all shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-slate-700 relative"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-slate-50 dark:border-slate-900 rounded-full animate-pulse"></span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                        <h4 className="font-bold text-sm text-slate-800 dark:text-white">Notifications</h4>
                        {unreadCount > 0 && (
                            <button onClick={markAllRead} className="text-[10px] font-bold text-ams-blue hover:underline flex items-center gap-1">
                                <Check className="w-3 h-3" /> Mark all read
                            </button>
                        )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-xs italic">
                                No new notifications.
                            </div>
                        ) : (
                            notifications.map(n => (
                                <div key={n.id} className={`p-4 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors relative group ${n.read ? 'opacity-60 bg-slate-50/50 dark:bg-slate-800/50' : 'bg-white dark:bg-slate-800'}`}>
                                    <div className="flex gap-3">
                                        <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${n.read ? 'bg-slate-300 dark:bg-slate-600' : n.type === 'alert' ? 'bg-red-500' : n.type === 'success' ? 'bg-green-500' : 'bg-blue-500'}`} />
                                        <div>
                                            <p className={`text-sm font-bold ${n.read ? 'text-slate-600 dark:text-slate-400' : 'text-slate-800 dark:text-white'}`}>{n.title}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{n.message}</p>
                                            <p className="text-[10px] text-slate-400 mt-2 font-mono">{new Date(n.timestamp).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    {!n.read && (
                                        <button 
                                            onClick={(e) => markAsRead(n.id, e)}
                                            className="absolute top-2 right-2 p-1 text-slate-300 hover:text-ams-blue opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Mark as Read"
                                        >
                                            <Check className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// Hook for passive notifications (Reminders, Compliance, Manager Alerts)
const useNotificationLogic = () => {
    const { user } = useAuth();
    const isManager = user?.role === Role.Manager || user?.role === Role.Admin;

    useEffect(() => {
        if (!user) return;

        const checkRoutine = async () => {
            const now = new Date();
            const nowStr = now.toDateString(); // Day granularity for compliance

            // 1. Shift Reminders (1 hour before)
            // Query shifts starting between now and now + 65 mins
            const startWindow = new Date(now.getTime());
            const endWindow = new Date(now.getTime() + 65 * 60 * 1000); // 65 mins window
            
            try {
                const qShifts = query(
                    collection(db, 'shifts'),
                    where('start', '>=', Timestamp.fromDate(startWindow)),
                    where('start', '<=', Timestamp.fromDate(endWindow))
                );
                
                const snap = await getDocs(qShifts);
                snap.docs.forEach(d => {
                    const data = d.data();
                    const shift = { 
                        ...data, 
                        id: d.id, 
                        start: data.start.toDate(), 
                        end: data.end.toDate() 
                    } as Shift;

                    // Check if I am on this shift
                    if (shift.slots.some(s => s.userId === user.uid)) {
                        const storageKey = `reminder_sent_${d.id}`;
                        if (!localStorage.getItem(storageKey)) {
                            // Send notification
                            sendNotification(user.uid, "Upcoming Shift", `You have a shift at ${shift.location} starting soon (${shift.start.toLocaleTimeString()}).`, 'info', '/rota');
                            sendBrowserNotification("Shift Reminder", `Shift at ${shift.location} starts in <1 hour.`);
                            localStorage.setItem(storageKey, 'true');
                        }
                    }
                });
            } catch (e) { console.error("Shift reminder check failed", e); }

            // 2. Compliance Check (Once per day)
            const compCheckKey = `comp_check_${user.uid}_${nowStr}`;
            if (!localStorage.getItem(compCheckKey)) {
                user.compliance?.forEach(doc => {
                    if (doc.expiryDate) {
                        const exp = new Date(doc.expiryDate);
                        const diffTime = exp.getTime() - now.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        if (diffDays < 30) {
                            sendNotification(user.uid, "Compliance Expiry", `Your ${doc.name} expires in ${diffDays} days.`, 'alert', '/profile');
                        }
                    }
                });
                localStorage.setItem(compCheckKey, 'true');
            }

            // 3. Manager Alerts (Uncovered Shifts & Failed Clock Outs)
            if (isManager) {
                const mgrCheckKey = `mgr_check_${now.getHours()}`; // Once per hour roughly
                if (!localStorage.getItem(mgrCheckKey)) {
                    // Check Uncovered Shifts < 24h
                    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                    const qUncovered = query(
                        collection(db, 'shifts'),
                        where('start', '>=', Timestamp.fromDate(now)),
                        where('start', '<=', Timestamp.fromDate(tomorrow))
                    );
                    const snapUncov = await getDocs(qUncovered);
                    let uncoveredCount = 0;
                    snapUncov.docs.forEach(d => {
                        const s = d.data() as Shift;
                        if (s.status !== 'Cancelled' && s.slots.some(slot => !slot.userId)) uncoveredCount++;
                    });
                    
                    if (uncoveredCount > 0) {
                        sendNotification(user.uid, "Staffing Alert", `${uncoveredCount} shifts in the next 24h have open slots.`, 'alert', '/rota');
                    }

                    // Check Failed Clock Outs (Shift ended > 4 hours ago but no clock out)
                    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
                    const qFailed = query(
                        collection(db, 'shifts'),
                        where('end', '>=', Timestamp.fromDate(yesterday)),
                        where('end', '<=', Timestamp.fromDate(fourHoursAgo))
                    );
                    const snapFailed = await getDocs(qFailed);
                    let failedCount = 0;
                    snapFailed.docs.forEach(d => {
                        const s = d.data() as Shift;
                        if (s.timeRecords) {
                            Object.values(s.timeRecords).forEach(tr => {
                                if (tr.clockInTime && !tr.clockOutTime) failedCount++;
                            });
                        }
                    });

                    if (failedCount > 0) {
                        sendNotification(user.uid, "Timesheet Alert", `${failedCount} staff members failed to clock out from yesterday's shifts.`, 'alert', '/rota');
                    }

                    localStorage.setItem(mgrCheckKey, 'true');
                }
            }
        };

        const interval = setInterval(checkRoutine, 60000); // Check every minute
        checkRoutine(); // Run immediately

        return () => clearInterval(interval);
    }, [user, isManager]);
};

const MainLayout = ({ children }: { children?: React.ReactNode }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Invoke Notification Logic Hook
  useNotificationLogic();

  const isClinical = user ? CLINICAL_ROLES.includes(user.role) : false;
  const isManager = user?.role === Role.Manager || user?.role === Role.Admin;
  const isEPRF = location.pathname === '/eprf';

  useEffect(() => {
      const requestPermissions = async () => {
          try {
              navigator.geolocation.getCurrentPosition(() => {}, () => {});
              requestBrowserPermission();
          } catch (e) {
              console.log("Permission request cycle partial or failed", e);
          }
      };
      requestPermissions();
  }, []);

  useEffect(() => {
      if (isEPRF) setCollapsed(true);
  }, [isEPRF]);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0F1115] transition-colors duration-300">
      {/* Sidebar - Desktop */}
      <aside className={`hidden md:flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'} z-40`}>
        <div className="p-6 flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-2 animate-in fade-in">
                <img src={logo} alt="Logo" className="h-8 w-auto object-contain" />
                <span className="font-bold text-lg text-slate-800 dark:text-white tracking-tight">Staff Hub</span>
            </div>
          )}
          {collapsed && <img src={logo} alt="Logo" className="h-8 w-auto mx-auto" />}
          <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto no-scrollbar">
          <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" active={location.pathname === '/'} collapsed={collapsed} />
          
          <div className="my-4 border-t border-slate-100 dark:border-slate-800 mx-2" />
          
          <SidebarItem to="/eprf" icon={FileText} label="ePRF Records" active={location.pathname === '/eprf'} collapsed={collapsed} />
          <SidebarItem to="/rota" icon={Calendar} label="Rota & Shifts" active={location.pathname === '/rota'} collapsed={collapsed} />
          <SidebarItem to="/assets" icon={Truck} label="Assets & Fleet" active={location.pathname === '/assets'} collapsed={collapsed} />
          
          {isClinical && (
             <SidebarItem to="/drugs" icon={Pill} label="Drugs Register" active={location.pathname === '/drugs'} collapsed={collapsed} />
          )}

          <div className="my-4 border-t border-slate-100 dark:border-slate-800 mx-2" />
          
          <SidebarItem to="/documents" icon={FolderOpen} label="Documents" active={location.pathname === '/documents'} collapsed={collapsed} />
          <SidebarItem to="/cpd" icon={BookOpen} label="CPD Portfolio" active={location.pathname === '/cpd'} collapsed={collapsed} />
          <SidebarItem to="/wellbeing" icon={Heart} label="Wellbeing Hub" active={location.pathname === '/wellbeing'} collapsed={collapsed} />
          
          {isManager && (
             <>
                <div className="my-4 border-t border-slate-100 dark:border-slate-800 mx-2" />
                <SidebarItem to="/staff" icon={Users} label="Staff Manager" active={location.pathname === '/staff'} collapsed={collapsed} />
                <SidebarItem to="/analytics" icon={PieChart} label="Clinical Analytics" active={location.pathname === '/analytics'} collapsed={collapsed} />
                <SidebarItem to="/major-incident" icon={AlertTriangle} label="Major Incident" active={location.pathname === '/major-incident'} collapsed={collapsed} />
             </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <button onClick={() => setShowHelp(true)} className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-4'} w-full py-2.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all font-medium text-sm group`}>
                <HelpCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                {!collapsed && <span>Help & Support</span>}
            </button>
            <button onClick={logout} className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-4'} w-full py-2.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all font-medium text-sm group`}>
                <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                {!collapsed && <span>Sign Out</span>}
            </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 z-50 px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
              <button onClick={() => setMobileMenuOpen(true)} className="p-2 -ml-2 text-slate-600 dark:text-slate-300">
                  <Menu className="w-6 h-6" />
              </button>
              <span className="font-bold text-lg text-slate-800 dark:text-white">Aegis</span>
          </div>
          <div className="flex items-center gap-2">
              <ThemeToggle />
              <div className="w-8 h-8 bg-ams-blue rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {user?.name.charAt(0)}
              </div>
          </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
          <div className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm md:hidden" onClick={() => setMobileMenuOpen(false)}>
              <div className="absolute left-0 top-0 bottom-0 w-64 bg-white dark:bg-slate-900 shadow-2xl p-4 flex flex-col" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-6">
                      <span className="font-bold text-xl text-slate-800 dark:text-white">Menu</span>
                      <button onClick={() => setMobileMenuOpen(false)}><X className="w-6 h-6 text-slate-500" /></button>
                  </div>
                  <nav className="space-y-1 flex-1 overflow-y-auto">
                      <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" active={location.pathname === '/'} collapsed={false} onClick={() => setMobileMenuOpen(false)} />
                      <SidebarItem to="/eprf" icon={FileText} label="ePRF Records" active={location.pathname === '/eprf'} collapsed={false} onClick={() => setMobileMenuOpen(false)} />
                      <SidebarItem to="/rota" icon={Calendar} label="Rota & Shifts" active={location.pathname === '/rota'} collapsed={false} onClick={() => setMobileMenuOpen(false)} />
                      <SidebarItem to="/assets" icon={Truck} label="Assets & Fleet" active={location.pathname === '/assets'} collapsed={false} onClick={() => setMobileMenuOpen(false)} />
                      {isClinical && <SidebarItem to="/drugs" icon={Pill} label="Drugs Register" active={location.pathname === '/drugs'} collapsed={false} onClick={() => setMobileMenuOpen(false)} />}
                      <div className="my-2 border-t border-slate-100 dark:border-slate-800" />
                      <SidebarItem to="/documents" icon={FolderOpen} label="Documents" active={location.pathname === '/documents'} collapsed={false} onClick={() => setMobileMenuOpen(false)} />
                      <SidebarItem to="/cpd" icon={BookOpen} label="CPD Portfolio" active={location.pathname === '/cpd'} collapsed={false} onClick={() => setMobileMenuOpen(false)} />
                      <SidebarItem to="/wellbeing" icon={Heart} label="Wellbeing Hub" active={location.pathname === '/wellbeing'} collapsed={false} onClick={() => setMobileMenuOpen(false)} />
                      {isManager && (
                          <>
                            <div className="my-2 border-t border-slate-100 dark:border-slate-800" />
                            <SidebarItem to="/staff" icon={Users} label="Staff Manager" active={location.pathname === '/staff'} collapsed={false} onClick={() => setMobileMenuOpen(false)} />
                            <SidebarItem to="/analytics" icon={PieChart} label="Clinical Analytics" active={location.pathname === '/analytics'} collapsed={false} onClick={() => setMobileMenuOpen(false)} />
                            <SidebarItem to="/major-incident" icon={AlertTriangle} label="Major Incident" active={location.pathname === '/major-incident'} collapsed={false} onClick={() => setMobileMenuOpen(false)} />
                          </>
                      )}
                  </nav>
                  
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <button onClick={() => { setShowHelp(true); setMobileMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm w-full">
                          <HelpCircle className="w-5 h-5" /> Help & Support
                      </button>
                      <button onClick={logout} className="flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl font-bold text-sm w-full">
                          <LogOut className="w-5 h-5" /> Sign Out
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
          <MajorIncidentBanner />
          <OfflineIndicator />
          
          {/* Desktop Top Bar - Hide on EPRF for workspace focus */}
          {!isEPRF && (
            <header className="hidden md:flex items-center justify-between px-8 py-5 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-b border-slate-200/50 dark:border-slate-800/50 sticky top-0 z-30">
                <div className="flex flex-col">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                        {location.pathname === '/' ? 'Dashboard' : location.pathname.substring(1).split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => window.location.reload()} 
                        className="p-2.5 rounded-xl hover:bg-white dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-all shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-slate-700" 
                        title="Force Refresh"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                    <ThemeToggle />
                    <NotificationBell />
                    <Link to="/profile" className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-700 group cursor-pointer">
                        <div className="text-right hidden lg:block">
                            <p className="text-sm font-bold text-slate-700 dark:text-white group-hover:text-ams-blue transition-colors">{user?.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{user?.role}</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-ams-blue to-cyan-500 p-[2px] shadow-sm group-hover:shadow-md transition-all">
                            <div className="w-full h-full rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-ams-blue font-bold overflow-hidden">
                                {user?.photoURL ? (
                                    <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" />
                                ) : (
                                    user?.name.charAt(0)
                                )}
                            </div>
                        </div>
                    </Link>
                </div>
            </header>
          )}

          <div className={`flex-1 overflow-y-auto ${isEPRF ? 'p-0' : 'p-4 md:p-8'} scroll-smooth`}>
              <div className="max-w-7xl mx-auto h-full">
                  {children}
              </div>
          </div>
      </main>

      {/* Global Modals */}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <DataSyncProvider>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/" element={<ProtectedRoute><MainLayout><Dashboard /></MainLayout></ProtectedRoute>} />
                <Route path="/eprf" element={<ProtectedRoute><MainLayout><EPRFPage /></MainLayout></ProtectedRoute>} />
                <Route path="/rota" element={<ProtectedRoute><MainLayout><RotaPage /></MainLayout></ProtectedRoute>} />
                <Route path="/assets" element={<ProtectedRoute><MainLayout><AssetPage /></MainLayout></ProtectedRoute>} />
                <Route path="/drugs" element={<ProtectedRoute allowedRoles={CLINICAL_ROLES}><MainLayout><DrugsPage /></MainLayout></ProtectedRoute>} />
                <Route path="/staff" element={<ProtectedRoute allowedRoles={[Role.Manager, Role.Admin]}><MainLayout><StaffPage /></MainLayout></ProtectedRoute>} />
                <Route path="/analytics" element={<ProtectedRoute allowedRoles={[Role.Manager, Role.Admin]}><MainLayout><ClinicalAnalyticsPage /></MainLayout></ProtectedRoute>} />
                <Route path="/documents" element={<ProtectedRoute><MainLayout><DocumentsPage /></MainLayout></ProtectedRoute>} />
                <Route path="/cpd" element={<ProtectedRoute><MainLayout><CPDPage /></MainLayout></ProtectedRoute>} />
                <Route path="/wellbeing" element={<ProtectedRoute><MainLayout><WellbeingPage /></MainLayout></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><MainLayout><ProfilePage /></MainLayout></ProtectedRoute>} />
                <Route path="/major-incident" element={<ProtectedRoute><MainLayout><MajorIncidentPage /></MainLayout></ProtectedRoute>} />
                <Route path="/calculators" element={<ProtectedRoute><MainLayout><CalculatorsPage /></MainLayout></ProtectedRoute>} />
                <Route path="/guidelines" element={<ProtectedRoute><MainLayout><GuidelineAssistant /></MainLayout></ProtectedRoute>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </DataSyncProvider>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
};

export default App;
