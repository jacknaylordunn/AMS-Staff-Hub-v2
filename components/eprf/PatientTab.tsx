
import React, { useState } from 'react';
import { useEPRF } from '../../context/EPRFContext';
import { Search, History, Download, X, User, AlertTriangle, FileText, ChevronRight, Loader2, UserPlus, Phone, Heart } from 'lucide-react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { EPRF, LinkedRecord } from '../../types';
import { logAuditAction } from '../../services/auditService';
import { useAuth } from '../../hooks/useAuth';
import AddressAutocomplete from '../AddressAutocomplete';
import DocumentViewerModal from '../DocumentViewerModal';

const PatientTab = () => {
    const { activeDraft, updateDraft, handleNestedUpdate } = useEPRF();
    const { user } = useAuth();
    
    // Search State
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [searchResults, setSearchResults] = useState<EPRF[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedHistoryItem, setSelectedHistoryItem] = useState<EPRF | null>(null);
    
    // Viewer State
    const [pdfViewUrl, setPdfViewUrl] = useState<string | null>(null);

    if (!activeDraft) return null;

    const performSpineSearch = async () => {
        // Validation - Allow single field
        const nhs = activeDraft.patient.nhsNumber?.trim();
        const lname = activeDraft.patient.lastName?.trim();
        const dob = activeDraft.patient.dob;

        if (!nhs && !lname && !dob) {
            alert("To search records, please enter NHS Number, Surname, or DOB.");
            return;
        }

        setIsSearching(true);
        setShowSearchModal(true);
        setSearchResults([]);
        setSelectedHistoryItem(null);

        try {
            let q;
            const collectionRef = collection(db, 'eprfs');
            
            // Prioritise robust search
            if (nhs) {
                q = query(collectionRef, where('patient.nhsNumber', '==', nhs), orderBy('lastUpdated', 'desc'), limit(10));
            } else if (lname && dob) {
                q = query(collectionRef, where('patient.lastName', '==', lname), where('patient.dob', '==', dob), orderBy('lastUpdated', 'desc'), limit(10));
            } else if (lname) {
                q = query(collectionRef, where('patient.lastName', '==', lname), orderBy('lastUpdated', 'desc'), limit(10));
            } else if (dob) {
                q = query(collectionRef, where('patient.dob', '==', dob), orderBy('lastUpdated', 'desc'), limit(10));
            }

            if (q) {
                const snapshot = await getDocs(q);
                const results = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as EPRF));
                const filtered = results.filter(r => r.id !== activeDraft.id);
                setSearchResults(filtered);

                if (user) {
                    await logAuditAction(user.uid, user.name, 'Spine Search', `Searched for patient: ${lname || 'NHS'+nhs}`, 'Clinical');
                }
            }
        } catch (e) {
            console.error("Spine Search Error", e);
            alert("Error connecting to patient records database.");
        } finally {
            setIsSearching(false);
        }
    };

    const handleImportDemographics = (record: EPRF) => {
        const p = record.patient;
        
        // Comprehensive Import
        const newPatient = {
            ...activeDraft.patient,
            firstName: p.firstName || activeDraft.patient.firstName,
            lastName: p.lastName || activeDraft.patient.lastName,
            dob: p.dob || activeDraft.patient.dob,
            nhsNumber: p.nhsNumber || activeDraft.patient.nhsNumber,
            address: p.address || activeDraft.patient.address,
            postcode: p.postcode || activeDraft.patient.postcode,
            gender: p.gender || activeDraft.patient.gender,
            contactNumber: p.contactNumber || activeDraft.patient.contactNumber,
            ethnicity: p.ethnicity || activeDraft.patient.ethnicity,
            // Import DNACPR Status if verified
            dnacpr: p.dnacpr?.verified ? p.dnacpr : activeDraft.patient.dnacpr
        };

        // Link the record
        const link: LinkedRecord = {
            incidentNumber: record.incidentNumber,
            date: record.lastUpdated,
            diagnosis: record.clinicalDecision?.workingImpression || 'Unknown',
            id: record.id
        };
        
        const currentLinks = activeDraft.linkedRecords || [];
        const newLinks = !currentLinks.some(l => l.id === link.id) 
            ? [...currentLinks, link] 
            : currentLinks;

        // Atomic update via root
        updateDraft({
            patient: newPatient,
            linkedRecords: newLinks
        });

        alert("Demographics imported and record linked.");
    };

    const generateUnknownPatient = () => {
        const id = Math.floor(Math.random() * 10000);
        // Estimate age ~30-50 for placeholder
        const year = new Date().getFullYear() - 40;
        
        updateDraft({
            patient: {
                ...activeDraft.patient,
                firstName: 'Unknown',
                lastName: `Male/Female ${id}`,
                dob: `${year}-01-01`,
                address: 'Unknown / No Fixed Abode',
                postcode: 'UNKNOWN',
                nhsNumber: '',
                gender: 'Unknown',
                contactNumber: '',
                ethnicity: 'Not Stated'
            }
        });
    };

    return (
        <div className="glass-panel p-4 rounded-xl space-y-6 animate-in fade-in slide-in-from-bottom-4 relative">
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-base text-slate-800 dark:text-white">Patient Demographics</h3>
                <div className="flex gap-2">
                    <button 
                        onClick={generateUnknownPatient} 
                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                        title="Generate placeholder details"
                    >
                        <UserPlus className="w-3 h-3" /> Unknown
                    </button>
                    <button 
                        onClick={performSpineSearch} 
                        className="flex items-center gap-2 px-3 py-1.5 bg-ams-blue text-white rounded-lg text-xs font-bold shadow-md hover:bg-blue-700 transition-all"
                    >
                        <Search className="w-3 h-3" /> AMS Spine Search
                    </button>
                </div>
            </div>
            
            {/* Primary Demographics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="input-label">First Name</label>
                    <input 
                        className="input-field py-1.5 px-3 text-sm h-9" 
                        value={activeDraft.patient.firstName} 
                        onChange={e => handleNestedUpdate(['patient', 'firstName'], e.target.value)} 
                        placeholder="Patient's First Name"
                    />
                </div>
                <div>
                    <label className="input-label">Last Name</label>
                    <input 
                        className="input-field py-1.5 px-3 text-sm h-9" 
                        value={activeDraft.patient.lastName} 
                        onChange={e => handleNestedUpdate(['patient', 'lastName'], e.target.value)} 
                        placeholder="Patient's Surname"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="input-label">Date of Birth</label>
                    <input 
                        type="date" 
                        className="input-field py-1.5 px-3 text-sm h-9" 
                        value={activeDraft.patient.dob} 
                        onChange={e => handleNestedUpdate(['patient', 'dob'], e.target.value)} 
                    />
                </div>
                <div>
                    <label className="input-label">Gender</label>
                    <select
                        className="input-field py-1.5 px-3 text-sm h-9"
                        value={activeDraft.patient.gender || ''}
                        onChange={e => handleNestedUpdate(['patient', 'gender'], e.target.value)}
                    >
                        <option value="">Select...</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Intersex">Intersex</option>
                        <option value="Transgender">Transgender</option>
                        <option value="Other">Other</option>
                        <option value="Not Stated">Not Stated</option>
                    </select>
                </div>
                <div>
                    <label className="input-label">NHS Number (Optional)</label>
                    <input 
                        className="input-field font-mono py-1.5 px-3 text-sm h-9" 
                        value={activeDraft.patient.nhsNumber || ''} 
                        onChange={e => handleNestedUpdate(['patient', 'nhsNumber'], e.target.value)} 
                        placeholder="10-digit NHS Number"
                        maxLength={10}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="input-label">Ethnicity</label>
                    <select
                        className="input-field py-1.5 px-3 text-sm h-9"
                        value={activeDraft.patient.ethnicity || ''}
                        onChange={e => handleNestedUpdate(['patient', 'ethnicity'], e.target.value)}
                    >
                        <option value="">Select...</option>
                        <option value="White British">White British</option>
                        <option value="White Irish">White Irish</option>
                        <option value="Other White">Other White</option>
                        <option value="Mixed">Mixed</option>
                        <option value="Asian or Asian British">Asian or Asian British</option>
                        <option value="Black or Black British">Black or Black British</option>
                        <option value="Chinese">Chinese</option>
                        <option value="Other">Other</option>
                        <option value="Not Stated">Not Stated</option>
                    </select>
                </div>
                <div>
                    <label className="input-label">Patient Contact Number</label>
                    <input 
                        type="tel"
                        className="input-field py-1.5 px-3 text-sm h-9" 
                        value={activeDraft.patient.contactNumber || ''} 
                        onChange={e => handleNestedUpdate(['patient', 'contactNumber'], e.target.value)} 
                        placeholder="Mobile or Home Phone"
                    />
                </div>
            </div>

            {/* Address */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                    <label className="input-label">Home Address</label>
                    <AddressAutocomplete
                        className="input-field py-1.5 px-3 text-sm h-9" 
                        value={activeDraft.patient.address} 
                        onChange={val => handleNestedUpdate(['patient', 'address'], val)}
                        onSelect={(addr, lat, lon, details) => {
                            if (details && details.postcode) {
                                handleNestedUpdate(['patient', 'postcode'], details.postcode);
                            }
                        }}
                        placeholder="House No, Street, Town"
                    />
                </div>
                <div>
                    <label className="input-label">Postcode</label>
                    <input 
                        className="input-field uppercase py-1.5 px-3 text-sm h-9" 
                        value={activeDraft.patient.postcode || ''} 
                        onChange={e => handleNestedUpdate(['patient', 'postcode'], e.target.value)} 
                        placeholder="e.g. AB1 2CD"
                    />
                </div>
            </div>

            {/* Next of Kin */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 mt-2">
                <h4 className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase mb-3 flex items-center gap-2">
                    <Heart className="w-4 h-4 text-pink-500" /> Next of Kin / Emergency Contact
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="input-label">Name</label>
                        <input 
                            className="input-field py-1.5 px-3 text-sm h-8" 
                            value={activeDraft.patient.nextOfKin?.name || ''} 
                            onChange={e => handleNestedUpdate(['patient', 'nextOfKin', 'name'], e.target.value)} 
                            placeholder="Next of Kin Name"
                        />
                    </div>
                    <div>
                        <label className="input-label">Relationship</label>
                        <input 
                            className="input-field py-1.5 px-3 text-sm h-8" 
                            value={activeDraft.patient.nextOfKin?.relationship || ''} 
                            onChange={e => handleNestedUpdate(['patient', 'nextOfKin', 'relationship'], e.target.value)} 
                            placeholder="e.g. Spouse, Parent"
                        />
                    </div>
                    <div>
                        <label className="input-label">Contact Number</label>
                        <input 
                            type="tel"
                            className="input-field py-1.5 px-3 text-sm h-8" 
                            value={activeDraft.patient.nextOfKin?.contactNumber || ''} 
                            onChange={e => handleNestedUpdate(['patient', 'nextOfKin', 'contactNumber'], e.target.value)} 
                            placeholder="Emergency Contact Phone"
                        />
                    </div>
                </div>
            </div>

            {/* DNACPR Status */}
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 p-4 rounded-xl mt-2">
                <h4 className="text-xs font-bold text-red-800 dark:text-red-300 uppercase mb-2">DNACPR Status</h4>
                <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex gap-2 bg-white dark:bg-slate-900 p-1 rounded-lg border border-red-100 dark:border-red-900">
                        <button 
                            onClick={() => handleNestedUpdate(['patient', 'dnacpr', 'hasDNACPR'], true)}
                            className={`px-3 py-1 rounded text-xs font-bold ${activeDraft.patient.dnacpr?.hasDNACPR ? 'bg-red-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                        >
                            Yes (In Place)
                        </button>
                        <button 
                            onClick={() => handleNestedUpdate(['patient', 'dnacpr', 'hasDNACPR'], false)}
                            className={`px-3 py-1 rounded text-xs font-bold ${!activeDraft.patient.dnacpr?.hasDNACPR ? 'bg-slate-200 text-slate-700' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                        >
                            No / Unknown
                        </button>
                    </div>
                    
                    {activeDraft.patient.dnacpr?.hasDNACPR && (
                        <>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-red-700 dark:text-red-300 font-bold">Date Issued:</span>
                                <input 
                                    type="date" 
                                    className="input-field py-1 px-2 text-xs w-32 h-8"
                                    value={activeDraft.patient.dnacpr?.dateIssued || ''}
                                    onChange={e => handleNestedUpdate(['patient', 'dnacpr', 'dateIssued'], e.target.value)}
                                />
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-red-800 dark:text-red-200">
                                <input 
                                    type="checkbox" 
                                    className="w-4 h-4 rounded text-red-600"
                                    checked={activeDraft.patient.dnacpr?.verified || false}
                                    onChange={e => handleNestedUpdate(['patient', 'dnacpr', 'verified'], e.target.checked)}
                                />
                                Physically Verified
                            </label>
                        </>
                    )}
                </div>
            </div>

            {/* Linked Records Display */}
            {activeDraft.linkedRecords && activeDraft.linkedRecords.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                    <h4 className="text-[10px] font-bold text-blue-800 dark:text-blue-300 uppercase mb-2 flex items-center gap-2">
                        <History className="w-3 h-3" /> Linked History
                    </h4>
                    <div className="space-y-1">
                        {activeDraft.linkedRecords.map((rec) => (
                            <div key={rec.id} className="flex justify-between items-center text-xs bg-white dark:bg-slate-900 p-2 rounded border border-blue-100 dark:border-blue-800">
                                <div>
                                    <span className="font-bold text-slate-700 dark:text-slate-300">{new Date(rec.date).toLocaleDateString()}</span>
                                    <span className="text-slate-500 mx-2">|</span>
                                    <span className="text-slate-600 dark:text-slate-400">{rec.diagnosis}</span>
                                </div>
                                <span className="font-mono text-slate-400">{rec.incidentNumber}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Search Modal */}
            {showSearchModal && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in duration-200 pt-10">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700">
                        {/* Header */}
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-ams-blue rounded-lg text-white">
                                    <Search className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-base text-slate-800 dark:text-white">Patient Record Search</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">AMS Internal Spine • Strictly Confidential</p>
                                </div>
                            </div>
                            <button onClick={() => setShowSearchModal(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
                        </div>

                        <div className="flex flex-1 overflow-hidden">
                            {/* List Column */}
                            <div className="w-1/3 border-r border-slate-200 dark:border-slate-700 overflow-y-auto bg-slate-50 dark:bg-slate-900/50">
                                {isSearching ? (
                                    <div className="flex flex-col items-center justify-center h-48 gap-3">
                                        <Loader2 className="w-8 h-8 text-ams-blue animate-spin" />
                                        <p className="text-xs font-bold text-slate-500">Searching Secure Database...</p>
                                    </div>
                                ) : searchResults.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400 text-sm">
                                        No previous records found matching these details.
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-200 dark:divide-slate-800">
                                        {searchResults.map(record => (
                                            <div 
                                                key={record.id} 
                                                onClick={() => setSelectedHistoryItem(record)}
                                                className={`p-3 cursor-pointer hover:bg-white dark:hover:bg-slate-800 transition-colors ${selectedHistoryItem?.id === record.id ? 'bg-white dark:bg-slate-800 border-l-4 border-ams-blue shadow-sm' : ''}`}
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="font-bold text-xs text-slate-500 dark:text-slate-400">{new Date(record.lastUpdated).toLocaleDateString()}</span>
                                                    <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded font-bold text-slate-600 dark:text-slate-300">{record.incidentNumber}</span>
                                                </div>
                                                <h4 className="font-bold text-sm text-slate-800 dark:text-white line-clamp-1">{record.clinicalDecision?.workingImpression || 'No Diagnosis'}</h4>
                                                
                                                {/* Show DNACPR Flag in List */}
                                                {record.patient.dnacpr?.hasDNACPR && (
                                                    <span className="mt-1 inline-block text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 rounded">DNACPR ON FILE</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Details Column */}
                            <div className="flex-1 overflow-y-auto p-4 bg-white dark:bg-slate-800">
                                {selectedHistoryItem ? (
                                    <div className="space-y-4 animate-in fade-in">
                                        {/* Actions */}
                                        <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                                            <div className="flex items-center gap-3">
                                                <User className="w-5 h-5 text-blue-600" />
                                                <div>
                                                    <p className="font-bold text-sm text-blue-900 dark:text-blue-100">Match Found</p>
                                                    <p className="text-xs text-blue-700 dark:text-blue-300">
                                                        {selectedHistoryItem.patient.firstName} {selectedHistoryItem.patient.lastName} (DOB: {selectedHistoryItem.patient.dob})
                                                    </p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleImportDemographics(selectedHistoryItem)}
                                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
                                            >
                                                <Download className="w-3 h-3" /> Import & Link
                                            </button>
                                        </div>

                                        {/* PDF Button */}
                                        {selectedHistoryItem.pdfUrl && (
                                            <button 
                                                onClick={() => setPdfViewUrl(selectedHistoryItem.pdfUrl || '')}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-white text-xs font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                                            >
                                                <FileText className="w-4 h-4" /> View Full Clinical Record (PDF)
                                            </button>
                                        )}

                                        {/* Alerts */}
                                        {selectedHistoryItem.patient.dnacpr?.hasDNACPR && (
                                            <div className="p-3 bg-red-100 dark:bg-red-900/40 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
                                                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                                                <div>
                                                    <p className="text-xs font-bold text-red-900 dark:text-red-100 uppercase">DNACPR ALERT</p>
                                                    <p className="text-sm text-red-800 dark:text-red-200">Patient has a DNACPR recorded on {new Date(selectedHistoryItem.patient.dnacpr.dateIssued || '').toLocaleDateString()}.</p>
                                                </div>
                                            </div>
                                        )}

                                        {selectedHistoryItem.history.allergies && selectedHistoryItem.history.allergies !== 'NKDA' && (
                                            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
                                                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                                                <div>
                                                    <p className="text-xs font-bold text-red-800 dark:text-red-200 uppercase">Historic Allergy Alert</p>
                                                    <p className="text-sm text-red-700 dark:text-red-300">{selectedHistoryItem.history.allergies}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Clinical Summary */}
                                        <div>
                                            <h4 className="font-bold text-xs text-slate-500 uppercase mb-2 flex items-center gap-2"><FileText className="w-4 h-4" /> Clinical Narrative</h4>
                                            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg text-sm leading-relaxed text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800 whitespace-pre-line">
                                                {selectedHistoryItem.assessment.clinicalNarrative || 'No narrative.'}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                        <ChevronRight className="w-12 h-12 mb-2 opacity-20" />
                                        <p className="text-sm">Select a record to view clinical details.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Viewer Modal */}
            {pdfViewUrl && (
                <DocumentViewerModal 
                    url={pdfViewUrl}
                    title="Historic Clinical Record"
                    onClose={() => setPdfViewUrl(null)}
                />
            )}
        </div>
    );
};

export default PatientTab;
