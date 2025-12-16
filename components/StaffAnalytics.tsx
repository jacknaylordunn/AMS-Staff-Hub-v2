
import React, { useState, useEffect } from 'react';
import { BarChart, Clock, Users, Award, TrendingUp, Loader2, AlertCircle, Bell } from 'lucide-react';
import { Role, User, ComplianceDoc } from '../types';
import { db } from '../services/firebase';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { sendNotification } from '../services/notificationService';
import { useToast } from '../context/ToastContext';

const AnalyticsCard = ({ icon: Icon, label, value, trend, color }: any) => (
  <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <h3 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{value}</h3>
      </div>
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
    </div>
    {trend && (
        <div className="mt-4 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-green-500" />
        <span className="text-xs font-bold text-green-600">{trend}</span>
        <span className="text-xs text-slate-400">vs last month</span>
        </div>
    )}
  </div>
);

const StaffAnalytics = () => {
  const [staffList, setStaffList] = useState<User[]>([]);
  const [totalHours, setTotalHours] = useState(0);
  const [activeStaffCount, setActiveStaffCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expiringDocs, setExpiringDocs] = useState<{userId: string, name: string, docName: string, days: number}[]>([]);
  const { toast } = useToast();

  useEffect(() => {
      const calculateStats = async () => {
          try {
              // Efficiently fetch active users
              const usersQ = query(collection(db, 'users'), where('status', '==', 'Active'));
              const usersSnap = await getDocs(usersQ);
              const users = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() } as User));
              
              setActiveStaffCount(users.length);
              setStaffList(users.sort((a,b) => (b.stats?.totalHours || 0) - (a.stats?.totalHours || 0)));

              // Calculate Totals using aggregated stats
              const grandTotalHours = users.reduce((acc, curr) => acc + (curr.stats?.totalHours || 0), 0);
              setTotalHours(Math.round(grandTotalHours));

              // Compliance Risk Scan
              const risks: {userId: string, name: string, docName: string, days: number}[] = [];
              const now = new Date();
              users.forEach(u => {
                  u.compliance?.forEach(doc => {
                      if (doc.expiryDate) {
                          const exp = new Date(doc.expiryDate);
                          const diffTime = exp.getTime() - now.getTime();
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          if (diffDays < 30) {
                              risks.push({ userId: u.uid, name: u.name, docName: doc.name, days: diffDays });
                          }
                      }
                  });
              });
              setExpiringDocs(risks.sort((a,b) => a.days - b.days));

          } catch (e) {
              console.error("Analytics error", e);
          } finally {
              setLoading(false);
          }
      };

      calculateStats();
  }, []);

  const handleNotify = async (userId: string, docName: string) => {
      if (!confirm(`Send notification to user about ${docName}?`)) return;
      try {
          await sendNotification(
              userId, 
              "Compliance Expiry Warning", 
              `Your document '${docName}' is expiring or expired. Please upload a new version.`,
              'alert'
          );
          toast.success("Notification sent");
      } catch (e) {
          toast.error("Failed to send notification");
      }
  };

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-ams-blue" /></div>;

  const maxHours = staffList[0]?.stats?.totalHours || 1;

  // Role Distribution Calc
  const roleDist = staffList.reduce((acc, curr) => {
      acc[curr.role] = (acc[curr.role] || 0) + 1;
      return acc;
  }, {} as Record<string, number>);

  const roleColors: any = {
      [Role.Paramedic]: 'bg-green-500',
      [Role.EMT]: 'bg-blue-500',
      [Role.Doctor]: 'bg-purple-500',
      [Role.Nurse]: 'bg-pink-500',
      [Role.FirstAider]: 'bg-slate-500',
      [Role.FREC3]: 'bg-amber-500',
      [Role.FREC4]: 'bg-orange-500'
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AnalyticsCard 
          icon={Clock} 
          label="Total Clinical Hours" 
          value={totalHours.toLocaleString()} 
          color="bg-ams-blue" 
        />
        <AnalyticsCard 
          icon={Users} 
          label="Active Staff" 
          value={activeStaffCount} 
          color="bg-ams-light-blue" 
        />
        <AnalyticsCard 
          icon={Award} 
          label="Avg Shifts / User" 
          value={activeStaffCount > 0 ? Math.round(staffList.reduce((a,c) => a+(c.stats?.completedShifts||0), 0) / activeStaffCount) : 0} 
          color="bg-green-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hours Leaderboard */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="font-bold text-slate-800 dark:text-white mb-6">Top Clinical Hours</h3>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {staffList.slice(0, 10).map((staff, idx) => {
              const hrs = staff.stats?.totalHours || 0;
              return (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-bold text-slate-700 dark:text-slate-200">{staff.name} <span className="text-slate-400 font-normal">({staff.role})</span></span>
                    <span className="font-bold text-slate-600 dark:text-slate-400">{hrs.toFixed(1)} hrs</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="bg-ams-blue h-2.5 rounded-full" 
                      style={{ width: `${(hrs / maxHours) * 100}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Compliance Risk & Role Distribution */}
        <div className="space-y-6">
            {/* Compliance Warning */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="font-bold text-red-700 dark:text-red-400 mb-4 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" /> Compliance Risk
                </h3>
                <div className="space-y-3 max-h-[200px] overflow-y-auto">
                    {expiringDocs.length === 0 ? (
                        <p className="text-sm text-slate-400 italic">No expiry warnings.</p>
                    ) : (
                        expiringDocs.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-sm p-2 bg-red-50 dark:bg-red-900/10 rounded-lg group">
                                <div>
                                    <div className="font-bold text-slate-800 dark:text-slate-200">{item.name}</div>
                                    <div className="text-xs text-slate-500">{item.docName}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-bold px-2 py-1 rounded ${item.days < 0 ? 'bg-red-200 text-red-800 dark:bg-red-900/30 dark:text-red-300' : 'bg-amber-200 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'}`}>
                                        {item.days < 0 ? 'EXPIRED' : `${item.days} days`}
                                    </span>
                                    <button onClick={() => handleNotify(item.userId, item.docName)} className="p-1.5 bg-white dark:bg-slate-800 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-ams-blue transition-colors shadow-sm" title="Notify Staff">
                                        <Bell className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Role Distribution */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="font-bold text-slate-800 dark:text-white mb-6">Role Distribution</h3>
            <div className="space-y-4">
                {Object.entries(roleDist).map(([role, count], idx) => (
                    <div key={idx} className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${roleColors[role] || 'bg-slate-400'}`}></div>
                        <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-slate-600 dark:text-slate-300">{role}</span>
                            <span className="text-slate-400">{count}</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${roleColors[role] || 'bg-slate-400'}`} style={{ width: `${(Number(count) / activeStaffCount) * 100}%` }}></div>
                        </div>
                        </div>
                    </div>
                ))}
            </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default StaffAnalytics;
