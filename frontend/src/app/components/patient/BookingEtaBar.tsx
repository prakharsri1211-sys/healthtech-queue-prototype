import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../../config/api';
import { LocationSelectorMap } from './LocationSelectorMap';

interface EtaData {
  travelTimeMinutes: number;
  queueWaitMinutes: number;
  totalTimeToTreatment: number;
}

export const BookingEtaBar = ({ doctorId, onLocationChange }: { doctorId: number, onLocationChange?: (coords: { lat: number; lng: number }) => void }) => {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [etaData, setEtaData] = useState<EtaData | null>(null);

  // Fetch ETA when coords change
  useEffect(() => {
    if (coords) {
      if (onLocationChange) onLocationChange(coords);
      fetch(`${API_BASE_URL}/api/appointments/eta?doctorId=${doctorId}&userLat=${coords.lat}&userLng=${coords.lng}`)
        .then(res => res.json())
        .then(data => setEtaData(data))
        .catch(err => console.error("Failed to fetch ETA", err));
    }
  }, [coords, doctorId, onLocationChange]);

  return (
    <div className="glass-card-dark p-4 rounded-2xl w-full max-w-md">
      <div className="mb-4">
        <p className="text-xs text-slate-400 uppercase font-semibold mb-2">Pickup / Starting Point</p>
        <LocationSelectorMap onLocationSelected={setCoords} />
      </div>

      {/* ETA Display */}
      {etaData ? (
        <div className="flex justify-between items-center bg-white/5 border border-white/5 p-4 rounded-2xl shadow-inner mt-4">
          <div className="text-center">
            <p className="text-2xl font-black text-slate-200">{etaData.travelTimeMinutes}<span className="text-sm font-bold text-slate-500"> mins</span></p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Travel</p>
          </div>
          <div className="text-slate-600 text-2xl font-black">+</div>
          <div className="text-center">
            <p className="text-2xl font-black text-slate-200">{etaData.queueWaitMinutes}<span className="text-sm font-bold text-slate-500"> mins</span></p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Queue</p>
          </div>
          <div className="text-slate-600 text-2xl font-black">=</div>
          <div className="text-center">
            <p className="text-2xl font-black text-emerald-400">{etaData.totalTimeToTreatment}<span className="text-sm font-bold text-emerald-500/70"> mins</span></p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Wait</p>
          </div>
        </div>
      ) : (
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center py-4">Select a location to calculate travel times...</p>
      )}
    </div>
  );
};
