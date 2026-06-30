const api = 'http://localhost:8080';

async function runTest() {
  let res = await fetch(`${api}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'abc1234', password: 'password123' })
  });
  console.log('User:', await res.text());
  
  res = await fetch(`${api}/api/specialties/Oncology/doctors`);
  console.log('Docs:', await res.text());
}

runTest().catch(console.error);
