
import React, { useState, useEffect } from 'react';
import { BarChart, Clock, Users, Award, TrendingUp, Loader2 } from 'lucide-react';
import { Role, Shift, TimeRecord } from '../types';
import { db } from '../services/firebase';
import { collection, getDocs, query, limit, orderBy } from 'firebase/firestore';

const AnalyticsCard = ({ icon: Icon, label, value, trend, color }: any) => (
  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <h3 className="text-2xl font-bold text-slate-800 mt-1">{value}</h3>
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

interface StaffStat {
    name: string;
    role: Role;
    hours: number;
    shifts: number;
}

const StaffAnalytics = () => {
  const [stats, setStats] = useState<StaffStat[]>([]);
  const [totalHours, setTotalHours] = useState(0);
  const [activeStaffCount, setActiveStaffCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      const calculateStats = async () => {
          try {
              // 1. Get Users
              const usersSnap = await getDocs(collection(db, 'users'));
              const users = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() } as any));
              setActiveStaffCount(users.filter((u: any) => u.status === 'Active').length);

              // 2. Get Shifts (Optimized: Last 500 shifts only)
              // This prevents loading the entire history of the company on a single dashboard load.
              const shiftsQ = query(
                  collection(db, 'shifts'),
                  orderBy('start', 'desc'),
                  limit(500)
              );
              
              const shiftsSnap = await getDocs(shiftsQ);
              const shifts = shiftsSnap.docs.map(d => d.data() as Shift);

              const userStats: Record<string, StaffStat> = {};

              // Initialize map
              users.forEach((u: any) => {
                  if (u.status === 'Active') {
                      userStats[u.uid] = { name: u.name, role: u.role, hours: 0, shifts: 0 };
                  }
              });

              let globalHours = 0;

              shifts.forEach(shift => {
                  // Check timeRecords for verified hours
                  if (shift.timeRecords) {
                      Object.entries(shift.timeRecords).forEach(([uid, r]) => {
                          const record = r as TimeRecord;
                          if (record.clockInTime && record.clockOutTime && userStats[uid]) {
                              const start = new Date(record.clockInTime).getTime();
                              const end = new Date(record.clockOutTime).getTime();
                              const hours = (end - start) / (1000 * 60 * 60);
                              userStats[uid].hours += hours;
                              userStats[uid].shifts += 1;
                              globalHours += hours;
                          }
                      });
                  }
              });

              setStats(Object.values(userStats).sort((a, b) => b.hours - a.hours));
              setTotalHours(Math.round(globalHours));
          } catch (e) {
              console.error("Analytics error", e);
          } finally {
              setLoading(false);
          }
      };

      calculateStats();
  }, []);

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-ams-blue" /></div>;

  const maxHours = Math.max(...stats.map(s => s.hours)) || 1;

  // Role Distribution Calc
  const roleDist = stats.reduce((acc, curr) => {
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
          value={activeStaffCount > 0 ? Math.round(stats.reduce((a,c) => a+c.shifts, 0) / activeStaffCount) : 0} 
          color="bg-green-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hours Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6">Top Clinical Hours</h3>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {stats.slice(0, 10).map((staff, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-bold text-slate-700">{staff.name} <span className="text-slate-400 font-normal">({staff.role})</span></span>
                  <span className="font-bold text-slate-600">{staff.hours.toFixed(1)} hrs</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-ams-blue h-2.5 rounded-full" 
                    style={{ width: `${(staff.hours / maxHours) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Role Distribution */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
           <h3 className="font-bold text-slate-800 mb-6">Role Distribution</h3>
           <div className="space-y-4">
              {Object.entries(roleDist).map(([role, count], idx) => (
                 <div key={idx} className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${roleColors[role] || 'bg-slate-400'}`}></div>
                    <div className="flex-1">
                       <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-slate-600">{role}</span>
                          <span className="text-slate-400">{count}</span>
                       </div>
                       <div className="w-full bg-slate-100 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${roleColors[role] || 'bg-slate-400'}`} style={{ width: `${(Number(count) / activeStaffCount) * 100}%` }}></div>
                       </div>
                    </div>
                 </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};

export default StaffAnalytics;
