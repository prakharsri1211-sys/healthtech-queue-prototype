import React, { useState } from 'react';

export const ClinicLocationSetup = () => {
  const [latitude, setLatitude] = useState<number | ''>('');
  const [longitude, setLongitude] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const detectLocation = () => {
    setLoading(true);
    setError('');
    
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setLoading(false);
      },
      () => {
        setError('Unable to retrieve your location. Please enter manually.');
        setLoading(false);
      }
    );
  };

  return (
    <div className="p-4 border rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Clinic Location Setup</h3>
      <button 
        type="button" 
        onClick={detectLocation}
        disabled={loading}
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Detecting...' : '📍 Auto-Detect Clinic Coordinates'}
      </button>

      {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Latitude</label>
          <input 
            type="number" 
            value={latitude} 
            onChange={(e) => setLatitude(parseFloat(e.target.value))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
            placeholder="e.g. 26.8467"
            step="any"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Longitude</label>
          <input 
            type="number" 
            value={longitude} 
            onChange={(e) => setLongitude(parseFloat(e.target.value))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
            placeholder="e.g. 80.9462"
            step="any"
          />
        </div>
      </div>
    </div>
  );
};
