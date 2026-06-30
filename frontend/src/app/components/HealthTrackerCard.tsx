import React, { useState } from 'react';

export default function HealthTrackerCard() {
    const [lastSync, setLastSync] = useState<string | null>(null);
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    const handleLogVitals = async () => {
        setStatus('loading');

        try {
            const response = await fetch('/api/vitals', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userName: 'JohnDoe', // Match the Java backend entity spelling
                    heartRate: 72,
                    status: 'Normal'
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to log vitals to database');
            }

            setLastSync(new Date().toLocaleString());
            setStatus('success');
        } catch (error) {
            console.error(error);
            setStatus('error');
        }
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '8px',
            zIndex: 9999, // Ensure it floats above MedClinic content
            fontFamily: '"Inter", "Segoe UI", sans-serif'
        }}>
            {/* Status Messages floating just above the button */}
            {lastSync && status === 'success' && (
                <div style={{
                    backgroundColor: 'white',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    fontSize: '12px',
                    color: '#0f172a',
                    border: '1px solid #e2e8f0'
                }}>
                    <span style={{ color: '#10b981', fontWeight: 600, marginRight: '4px' }}>✓</span>
                    Last Sync: {lastSync.split(', ')[1]} {/* Just show time for brevity */}
                </div>
            )}

            {status === 'error' && (
                <div style={{
                    backgroundColor: '#fee2e2',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    fontSize: '12px',
                    color: '#991b1b',
                    border: '1px solid #fecaca'
                }}>
                    Failed to log. Try again.
                </div>
            )}

            {/* Floating Action Button */}
            <button
                onClick={handleLogVitals}
                disabled={status === 'loading'}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 20px',
                    backgroundColor: status === 'loading' ? '#94a3b8' : '#0ea5e9', // MedClinic-style Light/Soft Blue
                    color: 'white',
                    border: 'none',
                    borderRadius: '9999px', // Pill shape
                    cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)',
                    transition: 'all 0.2s ease',
                    fontWeight: 600,
                    fontSize: '13px',
                    letterSpacing: '0.3px'
                }}
            >
                <div style={{
                    width: '8px',
                    height: '8px',
                    backgroundColor: status === 'loading' ? '#e2e8f0' : '#bae6fd',
                    borderRadius: '50%',
                    animation: status === 'loading' ? 'pulse 1.5s infinite' : 'none'
                }} />
                {status === 'loading' ? 'LOGGING...' : 'LOG VITALS'}
            </button>
        </div>
    );
}
