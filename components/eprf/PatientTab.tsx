
import React from 'react';
import { useEPRF } from '../../context/EPRFContext';
import { Search } from 'lucide-react';

const PatientTab = () => {
    const { activeDraft, handleNestedUpdate } = useEPRF();

    if (!activeDraft) return null;

    const handlePdsSearch = () => {
        // Loose validation: Check if we have *something* to search with
        const hasName = activeDraft.patient.firstName || activeDraft.patient.lastName;
        const hasNhs = activeDraft.patient.nhsNumber;
        const hasPostcode = activeDraft.patient.postcode;

        if (!hasName && !hasNhs && !hasPostcode) {
            alert("Please enter at least a Name, NHS Number, or Postcode to search.");
            return;
        }

        // Mock PDS Simulation
        const searchTerm = hasNhs || `${activeDraft.patient.firstName} ${activeDraft.patient.lastName}`;
        alert(`PDS Trace Successful for: ${searchTerm}\nDemographics updated.`);
        
        // Auto-fill logic (Mock)
        if (!activeDraft.patient.firstName) handleNestedUpdate(['patient', 'firstName'], 'John');
        if (!activeDraft.patient.lastName) handleNestedUpdate(['patient', 'lastName'], 'Doe');
        if (!activeDraft.patient.dob) handleNestedUpdate(['patient', 'dob'], '1980-05-15');
        if (!activeDraft.patient.address) handleNestedUpdate(['patient', 'address'], '123 Fake Street');
        if (!activeDraft.patient.postcode) handleNestedUpdate(['patient', 'postcode'], 'SW1A 1AA');
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
                    <label className="input-label">NHS Number (Optional)</label>
                    <input 
                        className="input-field" 
                        value={activeDraft.patient.nhsNumber || ''} 
                        onChange={e => handleNestedUpdate(['patient', 'nhsNumber'], e.target.value)} 
                        placeholder="10-digit NHS Number"
                        maxLength={10}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                    <label className="input-label">Street Address</label>
                    <input 
                        className="input-field" 
                        value={activeDraft.patient.address} 
                        onChange={e => handleNestedUpdate(['patient', 'address'], e.target.value)} 
                        placeholder="House No, Street, Town"
                    />
                </div>
                <div>
                    <label className="input-label">Postcode</label>
                    <input 
                        className="input-field" 
                        value={activeDraft.patient.postcode || ''} 
                        onChange={e => handleNestedUpdate(['patient', 'postcode'], e.target.value)} 
                        placeholder="e.g. AB1 2CD"
                    />
                </div>
            </div>
        </div>
    );
};

export default PatientTab;
