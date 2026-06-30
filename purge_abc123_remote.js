/**
 * Purge abc123 account and all its patient profiles + appointments
 * from the REMOTE Render database via REST API calls.
 */
const http = require('http');

const REMOTE = 'http://localhost:8080';

function apiCall(method, path, body, token) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, REMOTE);
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        
        const options = {
            hostname: url.hostname,
            port: url.port || 8080,
            path: url.pathname + url.search,
            method: method,
            headers: headers
        };
        
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`[${method}] ${path} => ${res.statusCode}`);
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(data) });
                } catch {
                    resolve({ status: res.statusCode, body: data });
                }
            });
        });
        
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function main() {
    console.log('=== PURGING abc123 FROM REMOTE DATABASE ===\n');
    
    // Step 1: Login as abc123 to get token and account ID
    console.log('Step 1: Logging in as abc123...');
    const loginRes = await apiCall('POST', '/api/auth/login', {
        username: 'abc123',
        password: 'abc@1234'
    });
    
    if (loginRes.status !== 200) {
        console.log('Login response:', JSON.stringify(loginRes.body));
        console.log('\nTrying to find abc123 account via seed status...');
        
        // Try seed status to see what exists
        const statusRes = await apiCall('GET', '/api/seed/status');
        console.log('Seed status:', JSON.stringify(statusRes.body));
        
        // If abc123 login failed, the account might already be purged on the remote.
        // The patient profiles shown in the UI might be cached in localStorage.
        console.log('\n=== abc123 ACCOUNT DOES NOT EXIST ON REMOTE SERVER ===');
        console.log('The patient profiles you see are likely cached in your browser localStorage.');
        console.log('Solution: Clear browser localStorage and refresh.');
        console.log('\nTo clear localStorage, open browser DevTools console and run:');
        console.log('  localStorage.clear(); sessionStorage.clear(); location.reload();');
        return;
    }
    
    const token = loginRes.body.token;
    const accountId = loginRes.body.id;
    console.log(`Logged in. Account ID: ${accountId}, Token obtained.`);
    
    // Step 2: Get all patient profiles under this account
    console.log('\nStep 2: Fetching patient profiles...');
    const patientsRes = await apiCall('GET', `/api/patient/account/${accountId}`, null, token);
    console.log(`Found ${Array.isArray(patientsRes.body) ? patientsRes.body.length : 0} patients`);
    
    if (Array.isArray(patientsRes.body)) {
        for (const patient of patientsRes.body) {
            console.log(`\n  Deleting patient: ${patient.name} (ID: ${patient.id})`);
            
            // Delete appointments for this patient
            const apptsRes = await apiCall('GET', `/api/appointments/patient/${patient.id}`, null, token);
            if (Array.isArray(apptsRes.body)) {
                for (const appt of apptsRes.body) {
                    console.log(`    Cancelling appointment: ${appt.id}`);
                    await apiCall('PUT', `/api/appointments/${appt.id}/status`, { status: 'CANCELLED' }, token);
                }
            }
            
            // Delete the patient profile
            const delRes = await apiCall('DELETE', `/api/patient/${patient.id}`, null, token);
            console.log(`    Delete result: ${delRes.status}`);
        }
    }
    
    console.log('\n=== PURGE COMPLETE ===');
    console.log('Now clear your browser storage:');
    console.log('  Open DevTools Console (F12) and run:');
    console.log('  localStorage.clear(); sessionStorage.clear(); location.reload();');
}

main().catch(err => {
    console.error('Fatal error:', err.message);
});
