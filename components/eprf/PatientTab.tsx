
import React from 'react';
import { useEPRF } from '../../context/EPRFContext';
import { Search } from 'lucide-react';

const PatientTab = () => {
    const { activeDraft, handleNestedUpdate } = useEPRF();

    if (!activeDraft) return null;

    const handlePdsSearch = () => {
        if (!activeDraft.patient.nhsNumber) {
            alert("Please enter an NHS Number to search.");
            return;
        }
        // Mock PDS
        alert("PDS Trace Successful. Demographics updated.");
        handleNestedUpdate(['patient', 'firstName'], 'John');
        handleNestedUpdate(['patient', 'lastName'], 'Doe');
        handleNestedUpdate(['patient', 'dob'], '1980-05-15');
        handleNestedUpdate(['patient', 'address'], '123 Fake Street, London, SW1A 1AA');
    };

    return (
        <div className="glass-panel p-6 rounded-2xl space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-800 dark:text-white">Patient Demographics</h3>
                <button onClick={handlePdsSearch} className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-200 transition-colors">
                    <Search className="w-3 h-3" /> PDS Trace
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="input-label">First Name</label>
                    <input 
                        className="input-field" 
                        value={activeDraft.patient.firstName} 
                        onChange={e => handleNestedUpdate(['patient', 'firstName'], e.target.value)} 
                        placeholder="Patient's First Name"
                    />
                </div>
                <div>
                    <label className="input-label">Last Name</label>
                    <input 
                        className="input-field" 
                        value={activeDraft.patient.lastName} 
                        onChange={e => handleNestedUpdate(['patient', 'lastName'], e.target.value)} 
                        placeholder="Patient's Surname"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="input-label">Date of Birth</label>
                    <input 
                        type="date" 
                        className="input-field" 
                        value={activeDraft.patient.dob} 
                        onChange={e => handleNestedUpdate(['patient', 'dob'], e.target.value)} 
                    />
                </div>
                <div>
                    <label className="input-label">NHS Number</label>
                    <input 
                        className="input-field" 
                        value={activeDraft.patient.nhsNumber} 
                        onChange={e => handleNestedUpdate(['patient', 'nhsNumber'], e.target.value)} 
                        placeholder="10-digit NHS Number"
                        maxLength={10}
                    />
                </div>
            </div>

            <div>
                <label className="input-label">Home Address</label>
                <textarea 
                    className="input-field" 
                    rows={2}
                    value={activeDraft.patient.address} 
                    onChange={e => handleNestedUpdate(['patient', 'address'], e.target.value)} 
                    placeholder="Full postal address..."
                />
            </div>
            
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl">
                <label className="flex items-center gap-3 font-bold text-amber-800 dark:text-amber-200 cursor-pointer">
                    <input 
                        type="checkbox" 
                        className="w-5 h-5 text-amber-600 rounded focus:ring-amber-500" 
                        checked={activeDraft.patient.chronicHypoxia} 
                        onChange={e => handleNestedUpdate(['patient', 'chronicHypoxia'], e.target.checked)} 
                    />
                    Patient has COPD / Chronic Hypoxia (Target SpO2 88-92%)
                </label>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-2 ml-8">
                    Checking this will adjust NEWS2 scoring to use SpO2 Scale 2 for all vital sign entries.
                </p>
            </div>
        </div>
    );
};

export default PatientTab;
