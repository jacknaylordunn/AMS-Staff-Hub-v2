
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, FileText, Calendar, Truck, AlertTriangle, LogOut,
  Menu, X, Users, Pill, BookOpen, Heart, ChevronRight, ChevronLeft, Sun, Moon, Bell, Check, Info
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
import OfflineIndicator from './components/OfflineIndicator';
import MajorIncidentBanner from './components/MajorIncidentBanner';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { DataSyncProvider } from './hooks/useDataSync';
import { ThemeProvider, useTheme } from './hooks/useTheme';
import { Role } from './types';
import { db } from './services/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

// Define Access Groups
const CLINICAL_ROLES = [Role.Paramedic, Role.Nurse, Role.Doctor, Role.Manager, Role.Admin];

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
    const [notifications, setNotifications] = useState<any[]>([]);

    useEffect(() => {
        if (!user) return;
        
        // 1. Check Compliance
        const docAlerts = user.compliance
            ?.filter(doc => {
                if (!doc.expiryDate) return false;
                const d = new Date(doc.expiryDate);
                if (isNaN(d.getTime())) return false; 
                const days = Math.ceil((d.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                return days < 30;
            })
            .map(doc => ({
                id: `doc-${doc.id}`,
                title: 'Compliance Alert',
                msg: `${doc.name} expires soon (${doc.expiryDate})`,
                time: 'Action Required',
                type: 'alert'
            })) || [];

        // 2. Check Announcements (Realtime)
        try {
            const q = query(collection(db, 'announcements'), orderBy('date', 'desc'), limit(3));
            const unsub = onSnapshot(q, (snap) => {
                const announceAlerts = snap.docs.map(d => ({
                    id: d.id,
                    title: d.data().priority === 'Urgent' ? 'Urgent Announcement' : 'New Announcement',
                    msg: d.data().title,
                    time: 'Just now',
                    type: d.data().priority === 'Urgent' ? 'alert' : 'info'
                }));
                setNotifications([...docAlerts, ...announceAlerts]);
            }, (error) => {
                // Silent catch for permission errors on initial load
            });
            return () => unsub();
        } catch(e) {
            // Graceful degradation
        }
    }, [user]);

    const unreadCount = notifications.length;

    return (
        <div className="relative">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="p-2.5 rounded-xl hover:bg-white dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-all shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-slate-700 relative"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-slate-900"></span>
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute right-0 top-14 w-80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-glass dark:shadow-none dark:border dark:border-slate-700 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 dark:text-white text-sm">Notifications</h3>
                            <button onClick={() => setNotifications([])} className="text-xs text-ams-blue font-bold hover:underline">Clear</button>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto">
                            {notifications.length === 0 && (
                                <div className="p-8 text-center text-slate-400 text-xs">No new notifications</div>
                            )}
                            {notifications.map(n => (
                                <div key={n.id} className="p-4 border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                            n.type === 'alert' ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 
                                            n.type === 'success' ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' :
                                            'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                                        }`}>
                                            {n.type === 'alert' ? <AlertTriangle className="w-3 h-3" /> : n.type === 'success' ? <Check className="w-3 h-3" /> : <Info className="w-3 h-3" />}
                                            {n.type.toUpperCase()}
                                        </span>
                                        <span className="text-[10px] text-slate-400">{n.time}</span>
                                    </div>
                                    <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm mt-1">{n.title}</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{n.msg}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Automatically collapse sidebar on ePRF page to give full screen space
  const isEPRF = location.pathname === '/eprf';

  // Automatically close mobile menu on route change
  useEffect(() => {
      setIsMobileMenuOpen(false);
  }, [location]);

  if (!user) return null;

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/eprf', icon: FileText, label: 'ePRF' },
    { path: '/rota', icon: Calendar, label: 'Rota & Leave' },
    { path: '/assets', icon: Truck, label: 'Fleet & Assets' },
  ];

  if (CLINICAL_ROLES.includes(user.role)) {
      navItems.push({ path: '/drugs', icon: Pill, label: 'CD Register' });
  }

  navItems.push(
    { path: '/cpd', icon: BookOpen, label: 'CPD Log' },
    { path: '/wellbeing', icon: Heart, label: 'Wellbeing Hub' },
    { path: '/major-incident', icon: AlertTriangle, label: 'Major Incident' },
  );

  if (user.role === Role.Manager || user.role === Role.Admin) {
      navItems.push({ path: '/staff', icon: Users, label: 'Staff Directory' });
  }

  return (
    <div className="flex h-screen bg-[#F4F5F7] dark:bg-[#0F1115] overflow-hidden font-sans transition-colors duration-300">
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[90] animate-in fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-[100] bg-white/90 dark:bg-[#172030]/95 backdrop-blur-2xl border-r border-white/50 dark:border-white/5 shadow-2xl transition-all duration-300 ease-out
        ${isSidebarCollapsed && !isEPRF ? 'w-20' : 'w-72'}
        ${!isEPRF ? 'md:relative md:translate-x-0 md:shadow-none md:bg-transparent md:backdrop-blur-none md:border-r-0' : ''}
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Collapse Toggle Button (Desktop Only) */}
        {!isEPRF && (
            <button 
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="hidden md:flex absolute -right-3 top-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full p-1 text-slate-500 shadow-sm hover:text-ams-blue z-50 transition-transform hover:scale-110"
                title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
                {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
        )}

        <div className={`h-full flex flex-col ${isSidebarCollapsed ? 'p-2' : 'p-6'}`}>
          <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} mb-8 px-2`}>
            <div className="flex items-center gap-3">
              <img 
                  src="https://145955222.fs1.hubspotusercontent-eu1.net/hubfs/145955222/AMS/Logo%20FINAL%20(2).png" 
                  alt="Logo" 
                  className="h-8 w-auto object-contain"
              />
              {!isSidebarCollapsed && (
                  <div>
                      <h1 className="font-bold text-slate-800 dark:text-white leading-tight text-lg">Aegis</h1>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold tracking-wider uppercase">Staff Hub v2.5</p>
                  </div>
              )}
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-2 text-slate-400 hover:text-slate-600 bg-white dark:bg-slate-800 rounded-full shadow-sm">
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto pr-2 no-scrollbar">
            {navItems.map((item) => (
              <SidebarItem
                key={item.path}
                to={item.path}
                icon={item.icon}
                label={item.label}
                active={location.pathname === item.path}
                collapsed={isSidebarCollapsed}
                onClick={() => setIsMobileMenuOpen(false)}
              />
            ))}
          </nav>

          <div className="mt-6 pt-6 border-t border-slate-200/60 dark:border-slate-700/60">
            <Link 
                to="/profile" 
                className={`flex items-center gap-3 p-2 rounded-xl hover:bg-white/60 dark:hover:bg-slate-800 transition-colors group mb-2 border border-transparent hover:border-white/50 hover:shadow-sm ${isSidebarCollapsed ? 'justify-center' : ''}`}
                title={isSidebarCollapsed ? "Profile" : undefined}
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-ams-blue to-ams-dark flex items-center justify-center text-white font-bold shadow-md ring-2 ring-white dark:ring-slate-700 text-sm flex-shrink-0">
                {user.name.charAt(0)}
              </div>
              {!isSidebarCollapsed && (
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate group-hover:text-ams-blue transition-colors">{user.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.role}</p>
                  </div>
              )}
            </Link>
            <button 
              onClick={logout}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all text-sm font-bold ${isSidebarCollapsed ? 'px-0' : 'px-4'}`}
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              {!isSidebarCollapsed && "Sign Out"}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <MajorIncidentBanner />
        <OfflineIndicator />
        
        {/* Header Bar */}
        <div className={`px-6 py-4 flex items-center justify-between sticky top-0 z-30 border-b transition-colors ${isEPRF ? 'bg-white border-slate-200 dark:bg-[#0F1115] dark:border-slate-800' : 'bg-white/80 dark:bg-[#0F1115]/80 backdrop-blur-md border-slate-200/50 dark:border-slate-800'}`}>
          <div className="flex items-center gap-3">
             {/* Show Menu button on mobile OR on desktop if in ePRF (collapsed) mode */}
             <button 
                onClick={() => setIsMobileMenuOpen(true)} 
                className={`${!isEPRF ? 'md:hidden' : ''} p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors`}
             >
                <Menu className="w-5 h-5" />
             </button>
             <div className={`${!isEPRF ? 'md:hidden' : ''} flex items-center gap-2`}>
                 <img src="https://145955222.fs1.hubspotusercontent-eu1.net/hubfs/145955222/AMS/Logo%20FINAL%20(2).png" className="h-6 w-auto" alt="Aegis" />
                 <span className="font-bold text-slate-800 dark:text-white text-sm">Aegis</span>
             </div>
          </div>
          
          <div className="flex items-center gap-3 ml-auto">
              <ThemeToggle />
              <NotificationBell />
          </div>
        </div>

        {/* Content Area */}
        <div className={`flex-1 overflow-auto ${isEPRF ? 'p-0' : 'p-4 md:p-8'} scroll-smooth relative`}>
           <div className={`${isEPRF ? 'max-w-full' : 'max-w-7xl mx-auto'} w-full pb-20 animate-slide-up`}>
              {children}
           </div>
        </div>
      </main>
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider>
          <DataSyncProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              
              {/* Protected Routes */}
              <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
              <Route path="/eprf" element={<ProtectedRoute><Layout><EPRFPage /></Layout></ProtectedRoute>} />
              <Route path="/rota" element={<ProtectedRoute><Layout><RotaPage /></Layout></ProtectedRoute>} />
              <Route path="/assets" element={<ProtectedRoute><Layout><AssetPage /></Layout></ProtectedRoute>} />
              
              {/* Drugs Page - Restricted to Clinical Roles */}
              <Route path="/drugs" element={
                  <ProtectedRoute allowedRoles={CLINICAL_ROLES}>
                      <Layout><DrugsPage /></Layout>
                  </ProtectedRoute>
              } />
              
              <Route path="/cpd" element={<ProtectedRoute><Layout><CPDPage /></Layout></ProtectedRoute>} />
              <Route path="/wellbeing" element={<ProtectedRoute><Layout><WellbeingPage /></Layout></ProtectedRoute>} />
              <Route path="/major-incident" element={<ProtectedRoute><Layout><MajorIncidentPage /></Layout></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Layout><ProfilePage /></Layout></ProtectedRoute>} />
              
              {/* Role Restricted Staff */}
              <Route path="/staff" element={
                  <ProtectedRoute allowedRoles={[Role.Manager, Role.Admin]}>
                      <Layout><StaffPage /></Layout>
                  </ProtectedRoute>
              } />
              
              {/* Catch all redirect to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </DataSyncProvider>
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
