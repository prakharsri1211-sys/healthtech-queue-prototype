const api = 'http://localhost:8080';

async function runTest() {
  let res = await fetch(`${api}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: "abc1234", password: "password123" })
  });
  let user = await res.json();

  res = await fetch(`${api}/api/availability`, {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + user.token }
  });
  console.log("GET /api/availability ->", res.status, await res.text());
}

runTest().catch(console.error);
