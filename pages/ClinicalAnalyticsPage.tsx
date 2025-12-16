
import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, getDocs, where, Timestamp, orderBy } from 'firebase/firestore';
import { BarChart, HorizontalBarChart, DonutChart } from '../components/analytics/AnalyticsCharts';
import { PieChart, TrendingUp, Clock, Truck, UserCheck, AlertOctagon, Filter, Calendar, MapPin, Activity, Stethoscope, Map as MapIcon } from 'lucide-react';
import { EPRF } from '../types';
import { Loader2 } from 'lucide-react';
import LeafletMap from '../components/LeafletMap';

const ClinicalAnalyticsPage = () => {
    const [eprfs, setEprfs] = useState<EPRF[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState<'Stats' | 'Heatmap'>('Stats');
    
    // Filters
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'All'>('30d');
    const [locationFilter, setLocationFilter] = useState<string>('All');
    const [uniqueLocations, setUniqueLocations] = useState<string[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                let q = query(collection(db, 'eprfs'), orderBy('lastUpdated', 'desc'));
                
                // Date Filtering
                if (timeRange !== 'All') {
                    const now = new Date();
                    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
                    const startDate = new Date(now.setDate(now.getDate() - days));
                    q = query(collection(db, 'eprfs'), where('lastUpdated', '>=', startDate.toISOString()));
                }

                const snapshot = await getDocs(q);
                const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as EPRF));
                
                // Extract unique locations for filter dropdown (simple dedupe)
                const locs = Array.from(new Set<string>(
                    data.map(d => d.location?.split(',')[0].trim()).filter((l): l is string => !!l)
                ));
                setUniqueLocations(locs.sort());

                // Apply Location Filter in memory if needed (Firestore constraint on multiple fields)
                const filteredData = locationFilter === 'All' 
                    ? data 
                    : data.filter(d => d.location?.includes(locationFilter));

                setEprfs(filteredData);
            } catch (e) {
                console.error("Analytics fetch error", e);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [timeRange, locationFilter]);

    // --- AGGREGATION LOGIC ---

    // 1. KPI Stats
    const totalIncidents = eprfs.length;
    const conveyedCount = eprfs.filter(e => e.clinicalDecision?.finalDisposition?.toLowerCase().includes('conveyed')).length;
    const conveyanceRate = totalIncidents > 0 ? Math.round((conveyedCount / totalIncidents) * 100) : 0;
    
    // Avg On Scene Time
    const avgOnScene = Math.round(eprfs.reduce((acc, curr) => {
        if (!curr.times.onScene || !curr.times.departScene) return acc;
        const start = new Date(`1970-01-01T${curr.times.onScene}`);
        const end = new Date(`1970-01-01T${curr.times.departScene}`);
        let diff = (end.getTime() - start.getTime()) / 60000; // minutes
        if (diff < 0) diff += 1440; // Handle midnight crossing roughly
        return acc + diff;
    }, 0) / (eprfs.filter(e => e.times.onScene && e.times.departScene).length || 1));

    // 2. Disposition Breakdown
    const dispositionCounts = eprfs.reduce((acc, curr) => {
        let disp = curr.clinicalDecision?.finalDisposition || 'Unknown';
        if (disp.includes('Conveyed')) disp = 'Conveyed';
        if (disp.includes('Discharged')) disp = 'Discharged';
        if (disp.includes('Refusal')) disp = 'Refused';
        if (disp.includes('Primary Care')) disp = 'GP Referral';
        
        acc[disp] = (acc[disp] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const dispositionData = Object.entries(dispositionCounts).map(([label, value]) => ({
        label, value: value as number, 
        color: label === 'Conveyed' ? '#3B82F6' : label === 'Discharged' ? '#10B981' : label === 'Refused' ? '#EF4444' : '#F59E0B'
    }));

    // 3. Impression Breakdown (Top 5)
    const impressionCounts = eprfs.reduce((acc, curr) => {
        const imp = curr.clinicalDecision?.workingImpression || 'Not Recorded';
        acc[imp] = (acc[imp] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const impressionData = Object.entries(impressionCounts)
        .sort((a,b) => (b[1] as number) - (a[1] as number))
        .slice(0, 5)
        .map(([label, value]) => ({ label, value: value as number }));

    // 4. Destination Hospital Heatmap (Top 5)
    const destinationCounts = eprfs.reduce((acc, curr) => {
        if (curr.clinicalDecision?.destinationHospital) {
            const hosp = curr.clinicalDecision.destinationHospital;
            acc[hosp] = (acc[hosp] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    const destinationData = Object.entries(destinationCounts)
        .sort((a,b) => (b[1] as number) - (a[1] as number))
        .slice(0, 5)
        .map(([label, value]) => ({ label, value: value as number }));

    // 5. Injury Types (Body Map data)
    const injuryCounts = eprfs.reduce((acc, curr) => {
        curr.injuries?.forEach(inj => {
            if (inj.type === 'Injury' || inj.type === 'Pain') {
                const region = inj.location?.split('(')[0].trim() || 'Unknown';
                acc[region] = (acc[region] || 0) + 1;
            }
        });
        return acc;
    }, {} as Record<string, number>);

    const injuryData = Object.entries(injuryCounts)
        .sort((a,b) => (b[1] as number) - (a[1] as number))
        .slice(0, 6)
        .map(([label, value]) => ({ label, value: value as number }));

    // 6. Map Markers
    const mapMarkers = eprfs
        .filter(e => e.location && e.location.includes(','))
        .map(e => {
            const parts = e.location.split(',');
            const lat = parseFloat(parts[0]);
            const lng = parseFloat(parts[1]);
            return {
                id: e.id,
                lat, lng,
                label: e.incidentNumber,
                description: e.clinicalDecision?.workingImpression || 'Unknown Incident',
                color: e.clinicalDecision?.finalDisposition?.includes('Conveyed') ? '#3B82F6' : '#10B981'
            };
        })
        .filter(m => !isNaN(m.lat) && !isNaN(m.lng));


    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-ams-blue" /></div>;

    return (
        <div className="space-y-8 pb-20">
            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                        <PieChart className="w-8 h-8 text-ams-blue" /> Clinical Analytics
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Operational insights and clinical trends.</p>
                </div>
                
                <div className="flex flex-wrap gap-3">
                    {/* View Toggle */}
                    <div className="bg-slate-100 dark:bg-slate-700 p-1 rounded-xl flex">
                        <button onClick={() => setActiveView('Stats')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeView === 'Stats' ? 'bg-white dark:bg-slate-600 shadow text-ams-blue dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>Stats</button>
                        <button onClick={() => setActiveView('Heatmap')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${activeView === 'Heatmap' ? 'bg-white dark:bg-slate-600 shadow text-ams-blue dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}><MapIcon className="w-3 h-3" /> Heatmap</button>
                    </div>

                    {/* Time Filter */}
                    <div className="bg-slate-100 dark:bg-slate-700 p-1 rounded-xl flex">
                        {['7d', '30d', '90d', 'All'].map(t => (
                            <button 
                                key={t}
                                onClick={() => setTimeRange(t as any)}
                                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${timeRange === t ? 'bg-white dark:bg-slate-600 shadow text-ams-blue dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    {/* Location Filter */}
                    <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select 
                            className="pl-9 pr-4 py-2.5 bg-slate-100 dark:bg-slate-700 border-none rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-ams-blue cursor-pointer appearance-none"
                            value={locationFilter}
                            onChange={e => setLocationFilter(e.target.value)}
                        >
                            <option value="All">All Locations</option>
                            {uniqueLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {activeView === 'Stats' ? (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Incidents</p>
                                    <h3 className="text-3xl font-bold text-slate-800 dark:text-white mt-1">{totalIncidents}</h3>
                                </div>
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-xl"><Activity className="w-6 h-6" /></div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Conveyance Rate</p>
                                    <h3 className="text-3xl font-bold text-slate-800 dark:text-white mt-1">{conveyanceRate}%</h3>
                                </div>
                                <div className="p-3 bg-purple-50 dark:bg-purple-900/30 text-purple-600 rounded-xl"><Truck className="w-6 h-6" /></div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg On-Scene</p>
                                    <h3 className="text-3xl font-bold text-slate-800 dark:text-white mt-1">{isNaN(avgOnScene) ? '-' : avgOnScene} <span className="text-sm text-slate-400 font-medium">mins</span></h3>
                                </div>
                                <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-xl"><Clock className="w-6 h-6" /></div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Discharges</p>
                                    <h3 className="text-3xl font-bold text-slate-800 dark:text-white mt-1">{dispositionCounts['Discharged'] || 0}</h3>
                                </div>
                                <div className="p-3 bg-green-50 dark:bg-green-900/30 text-green-600 rounded-xl"><UserCheck className="w-6 h-6" /></div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
                        {/* Outcomes Breakdown */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
                            <h3 className="font-bold text-slate-800 dark:text-white mb-6">Outcome Analysis</h3>
                            <div className="flex-1 flex items-center justify-center">
                                <DonutChart data={dispositionData} size={180} />
                            </div>
                        </div>

                        {/* Top Impressions */}
                        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                                <Stethoscope className="w-5 h-5 text-ams-blue" /> Top Clinical Impressions
                            </h3>
                            <HorizontalBarChart data={impressionData} color="#0052CC" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in">
                        {/* Destination Hospitals */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                                <Truck className="w-5 h-5 text-purple-600" /> Top Destinations
                            </h3>
                            <HorizontalBarChart data={destinationData} color="#8B5CF6" />
                        </div>

                        {/* Injury Locations */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                                <AlertOctagon className="w-5 h-5 text-red-600" /> Injury Body Regions
                            </h3>
                            <BarChart data={injuryData} color="#EF4444" height={220} />
                        </div>
                    </div>
                </>
            ) : (
                <div className="h-[600px] bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden animate-in fade-in relative">
                    <LeafletMap 
                        height="100%"
                        markers={mapMarkers}
                        center={mapMarkers.length > 0 ? [mapMarkers[0].lat, mapMarkers[0].lng] : [51.505, -0.09]}
                        zoom={10}
                    />
                    <div className="absolute bottom-6 left-6 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-xl z-[400] text-xs">
                        <h4 className="font-bold text-slate-800 dark:text-white mb-2">Incident Key</h4>
                        <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 rounded-full bg-blue-500"></div> <span className="dark:text-slate-300">Conveyed</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> <span className="dark:text-slate-300">Discharged / Other</span></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClinicalAnalyticsPage;
