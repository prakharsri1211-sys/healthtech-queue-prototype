const api = 'http://localhost:8080';

async function runTest() {
  let res = await fetch(`${api}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'abc1234', password: 'password123' })
  });
  console.log('User login status:', res.status);
  
  res = await fetch(`${api}/api/specialties/Oncology/doctors`);
  console.log('Docs fetch status:', res.status);
}

runTest().catch(console.error);
