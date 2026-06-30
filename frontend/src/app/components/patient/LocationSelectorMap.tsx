import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, Loader2 } from 'lucide-react';

// Fix leaflet default icon issue with bundlers
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetinaUrl,
  iconUrl: iconUrl,
  shadowUrl: shadowUrl,
});

interface LocationSelectorMapProps {
  onLocationSelected: (coords: { lat: number; lng: number }) => void;
  defaultCoords?: { lat: number; lng: number };
  theme?: 'light' | 'dark';
}

// Component to handle dynamic map centering
function MapCenterUpdater({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], map.getZoom(), {
      animate: true,
    });
  }, [center, map]);
  return null;
}

export const LocationSelectorMap: React.FC<LocationSelectorMapProps> = ({ 
  onLocationSelected, 
  defaultCoords = { lat: 26.8467, lng: 80.9462 }, // Default to Lucknow (example)
  theme = 'dark'
}) => {
  const [postalCode, setPostalCode] = useState('');
  const [position, setPosition] = useState(defaultCoords);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const markerRef = useRef<L.Marker>(null);

  // Initialize once
  useEffect(() => {
    // Try to load from localStorage first
    const savedLocation = localStorage.getItem('patientLocation');
    if (savedLocation) {
      try {
        const parsed = JSON.parse(savedLocation);
        if (parsed.lat && parsed.lng) {
          setPosition(parsed);
          onLocationSelected(parsed);
          return;
        }
      } catch (e) {
        // ignore
      }
    }
    
    // Otherwise use default
    onLocationSelected(defaultCoords);
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postalCode.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(postalCode)}&format=json&limit=1`);
      const data = await res.json();

      if (data && data.length > 0) {
        const newPos = { 
          lat: parseFloat(data[0].lat), 
          lng: parseFloat(data[0].lon) 
        };
        setPosition(newPos);
        onLocationSelected(newPos);
        localStorage.setItem('patientLocation', JSON.stringify(newPos));
      } else {
        setError('Postal code not found. Please try again or drag the pin manually.');
      }
    } catch (err) {
      setError('Error communicating with mapping service.');
    } finally {
      setIsLoading(false);
    }
  };

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const newPos = marker.getLatLng();
          const newCoords = { lat: newPos.lat, lng: newPos.lng };
          setPosition(newCoords);
          onLocationSelected(newCoords);
          localStorage.setItem('patientLocation', JSON.stringify(newCoords));
        }
      },
    }),
    [onLocationSelected]
  );

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="relative w-full">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MapPin size={16} className="text-slate-500" />
        </div>
        <input
          type="text"
          className={`block w-full pl-10 pr-12 py-3 border rounded-2xl text-sm font-bold placeholder-slate-500 focus:ring-sky-500/50 focus:border-sky-500/50 outline-none transition-all shadow-inner ${
            theme === 'dark' 
              ? 'border-white/10 text-slate-200 bg-white/5' 
              : 'border-slate-200 text-slate-900 bg-white'
          }`}
          placeholder="Enter 6-Digit Postal Code"
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSearch(e as any);
            }
          }}
          maxLength={10}
        />
        <div className="absolute inset-y-0 right-0 pr-1 flex items-center">
          <button
            type="button"
            onClick={(e) => handleSearch(e as any)}
            disabled={isLoading || !postalCode.trim()}
            className="p-2 bg-sky-500/20 text-sky-400 rounded-xl hover:bg-sky-500/30 disabled:opacity-50 disabled:bg-slate-800 disabled:text-slate-600 transition-colors"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          </button>
        </div>
      </div>

      {error && <p className="text-xs font-semibold text-rose-500 px-1">{error}</p>}

      <div className={`relative w-full h-[250px] rounded-2xl overflow-hidden border shadow-inner z-0 ${
        theme === 'dark' ? 'border-white/10 bg-slate-900' : 'border-slate-200 bg-slate-100'
      }`}>
        <MapContainer 
          center={[position.lat, position.lng]} 
          zoom={13} 
          scrollWheelZoom={true} 
          style={{ height: '100%', width: '100%', zIndex: 0 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapCenterUpdater center={position} />
          <Marker
            draggable={true}
            eventHandlers={eventHandlers}
            position={[position.lat, position.lng]}
            ref={markerRef}
          />
        </MapContainer>
        <div className={`absolute top-2 right-2 backdrop-blur-md px-3 py-1.5 rounded-xl border shadow-xl pointer-events-none z-[1000] ${
          theme === 'dark' ? 'bg-slate-900/90 border-white/10 text-slate-400' : 'bg-white/90 border-slate-200 text-slate-500'
        }`}>
          <p className="text-[9px] font-black uppercase tracking-widest">Drag Pin to Adjust</p>
        </div>
      </div>
    </div>
  );
};
