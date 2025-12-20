
import React, { useState, useEffect, useRef } from 'react';
import { Loader2, MapPin } from 'lucide-react';

interface AddressAutocompleteProps {
    value: string;
    onChange: (val: string) => void;
    onSelect?: (address: string, lat: number, lon: number, details?: any) => void;
    placeholder?: string;
    className?: string;
}

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({ 
    value, 
    onChange, 
    onSelect, 
    placeholder = "Start typing address...", 
    className 
}) => {
    const [query, setQuery] = useState(value);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Sync internal state with external value prop updates (e.g. from GPS button)
    useEffect(() => {
        setQuery(value);
    }, [value]);

    useEffect(() => {
        // Close dropdown when clicking outside
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const fetchSuggestions = async () => {
            if (!query || query.length < 3) {
                setSuggestions([]);
                return;
            }

            // Don't search if the query is coordinates
            if (/^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?/.test(query)) return;

            setLoading(true);
            try {
                // Determine if input looks like a postcode to adjust query logic if needed
                // Nominatim handles both freeform text and postcodes via 'q' parameter well.
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5&countrycodes=gb`
                );
                const data = await response.json();
                setSuggestions(data);
                setShowDropdown(true);
            } catch (e) {
                console.error("Address lookup failed", e);
            } finally {
                setLoading(false);
            }
        };

        const timeoutId = setTimeout(fetchSuggestions, 500); // 500ms debounce
        return () => clearTimeout(timeoutId);
    }, [query]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);
        onChange(val);
    };

    const handleSelect = (item: any) => {
        const formattedAddress = item.display_name;
        setQuery(formattedAddress);
        onChange(formattedAddress);
        setShowDropdown(false);
        
        if (onSelect) {
            onSelect(
                formattedAddress, 
                parseFloat(item.lat), 
                parseFloat(item.lon), 
                item.address
            );
        }
    };

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div className="relative">
                <input
                    type="text"
                    className={className || "w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-3 pr-10 py-1.5 text-sm h-8 outline-none focus:ring-2 focus:ring-ams-blue dark:text-white shadow-sm"}
                    value={query}
                    onChange={handleInputChange}
                    placeholder={placeholder}
                    onFocus={() => { if(suggestions.length > 0) setShowDropdown(true); }}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                </div>
            </div>

            {showDropdown && suggestions.length > 0 && (
                <div className="absolute z-[1000] w-full mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 max-h-60 overflow-y-auto">
                    {suggestions.map((item, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleSelect(item)}
                            className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-0"
                        >
                            <p className="text-sm font-medium text-slate-800 dark:text-white truncate">
                                {item.address.road || item.address.building || item.address.house_number || item.address.postcode || item.display_name.split(',')[0]}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                {item.display_name}
                            </p>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AddressAutocomplete;
