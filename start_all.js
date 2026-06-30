const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Read and parse .env file
function loadEnv(envPath) {
    if (!fs.existsSync(envPath)) return {};
    const content = fs.readFileSync(envPath, 'utf8');
    const env = {};
    content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const index = trimmed.indexOf('=');
        if (index === -1) return;
        const key = trimmed.substring(0, index).trim();
        const val = trimmed.substring(index + 1).trim();
        env[key] = val;
    });
    return env;
}

// Load envs
const rootEnv = loadEnv(path.join(__dirname, '.env'));
const backendEnv = loadEnv(path.join(__dirname, 'backend', '.env'));

// Merge envs (process.env <- backendEnv <- rootEnv)
const mergedEnv = {
    ...process.env,
    ...rootEnv,
    ...backendEnv
};

// If local postgres and mongodb are running, let's ensure we override to localhost if needed
// Or let's keep the env variables as they are in .env
console.log('Starting Backend (Maven)...');
const backendProcess = spawn('mvnw.cmd', ['spring-boot:run', '-DskipTests'], {
    cwd: path.join(__dirname, 'backend'),
    env: mergedEnv,
    shell: true
});

backendProcess.stdout.on('data', (data) => {
    process.stdout.write(`[Backend] ${data}`);
});

backendProcess.stderr.on('data', (data) => {
    process.stderr.write(`[Backend ERROR] ${data}`);
});

console.log('Starting Frontend (Vite)...');
const frontendProcess = spawn('npm.cmd', ['run', 'dev'], {
    cwd: path.join(__dirname, 'frontend'),
    env: mergedEnv,
    shell: true
});

frontendProcess.stdout.on('data', (data) => {
    process.stdout.write(`[Frontend] ${data}`);
});

frontendProcess.stderr.on('data', (data) => {
    process.stderr.write(`[Frontend ERROR] ${data}`);
});

process.on('SIGINT', () => {
    backendProcess.kill();
    frontendProcess.kill();
    process.exit();
});
