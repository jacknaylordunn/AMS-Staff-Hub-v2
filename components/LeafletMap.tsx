
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import { MapPin, Navigation, Search, Loader2 } from 'lucide-react';
import L from 'leaflet';

const createIcon = (color: string = "#DC2626") => {
    return L.divIcon({
        className: 'custom-icon',
        // Removed transform:translate(-12px, -24px) as iconAnchor handles this precise positioning
        html: `<div style="filter: drop-shadow(0 4px 3px rgb(0 0 0 / 0.3)); color: ${color};">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="${color}" fill-opacity="0.2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
               </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32], // Tip of the pin (bottom-center)
        popupAnchor: [0, -32]
    });
};

interface MarkerData {
    id: string;
    lat: number;
    lng: number;
    label?: string;
    description?: string;
    color?: string;
}

interface LeafletMapProps {
    markers?: MarkerData[];
    center?: [number, number];
    zoom?: number;
    height?: string;
    interactive?: boolean;
    onLocationSelect?: (lat: number, lng: number, address?: string) => void;
    showSearch?: boolean;
}

// Component to handle map clicks
const LocationSelector = ({ onSelect }: { onSelect: (lat: number, lng: number) => void }) => {
    useMapEvents({
        click(e) {
            onSelect(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
};

// Component to re-center map
const RecenterMap = ({ center }: { center: [number, number] }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(center);
    }, [center, map]);
    return null;
};

const LeafletMap: React.FC<LeafletMapProps> = ({ 
    markers = [], 
    center = [51.505, -0.09], 
    zoom = 13, 
    height = "400px", 
    interactive = false,
    onLocationSelect,
    showSearch = false
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [mapCenter, setMapCenter] = useState<[number, number]>(center);
    const [tempMarker, setTempMarker] = useState<[number, number] | null>(null);

    useEffect(() => {
        setMapCenter(center);
    }, [center]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery) return;
        setIsSearching(true);
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
            const data = await response.json();
            if (data && data.length > 0) {
                const { lat, lon, display_name } = data[0];
                const newCenter: [number, number] = [parseFloat(lat), parseFloat(lon)];
                setMapCenter(newCenter);
                setTempMarker(newCenter);
                if (onLocationSelect) onLocationSelect(newCenter[0], newCenter[1], display_name);
            } else {
                alert("Location not found");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSearching(false);
        }
    };

    const handleMapClick = async (lat: number, lng: number) => {
        if (!interactive || !onLocationSelect) return;
        setTempMarker([lat, lng]);
        
        // Reverse Geocoding
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await response.json();
            onLocationSelect(lat, lng, data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        } catch (e) {
            onLocationSelect(lat, lng, `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
    };

    return (
        <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm" style={{ height }}>
            {showSearch && (
                <div className="absolute top-4 left-4 right-14 z-[400] max-w-sm">
                    <form onSubmit={handleSearch} className="flex gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-xl shadow-lg border border-slate-200 dark:border-slate-600">
                        <input 
                            className="flex-1 bg-transparent px-3 py-1.5 outline-none text-sm dark:text-white"
                            placeholder="Search address..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button type="submit" className="p-2 bg-ams-blue text-white rounded-lg hover:bg-blue-700 transition-colors">
                            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        </button>
                    </form>
                </div>
            )}

            <MapContainer center={mapCenter} zoom={zoom} style={{ height: "100%", width: "100%", zIndex: 0 }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <RecenterMap center={mapCenter} />
                
                {interactive && <LocationSelector onSelect={handleMapClick} />}

                {/* Display Markers */}
                {markers.map(m => (
                    <Marker key={m.id} position={[m.lat, m.lng]} icon={createIcon(m.color || '#0052CC')}>
                        {(m.label || m.description) && (
                            <Popup>
                                <div className="font-sans">
                                    {m.label && <div className="font-bold text-sm text-slate-900">{m.label}</div>}
                                    {m.description && <div className="text-xs text-slate-600 mt-1">{m.description}</div>}
                                </div>
                            </Popup>
                        )}
                    </Marker>
                ))}

                {/* Temporary Selection Marker */}
                {tempMarker && interactive && (
                    <Marker position={tempMarker} icon={createIcon('#10B981')} />
                )}
            </MapContainer>
        </div>
    );
};

export default LeafletMap;
