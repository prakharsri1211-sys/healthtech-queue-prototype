const http = require('http');

const loginData = JSON.stringify({
    username: "doctor1",
    password: "password123"
});

const loginReq = http.request(
    {
        hostname: 'localhost',
        port: 8080,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': loginData.length
        }
    },
    res => {
        let str = '';
        res.on('data', chunk => str += chunk);
        res.on('end', () => {
            console.log('Login:', res.statusCode, str);
            const token = JSON.parse(str).token;

            const availData = JSON.stringify({
                doctorId: 1,
                date: "2026-04-10",
                startTime: "09:00:00",
                endTime: "17:00:00",
                closed: true, // test closed vs isClosed
                patientCapacity: 20
            });

            const availReq = http.request(
                {
                    hostname: 'localhost',
                    port: 8080,
                    path: '/api/availability',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': availData.length,
                        'Authorization': `Bearer ${token}`
                    }
                },
                resA => {
                    let strA = '';
                    resA.on('data', chunk => strA += chunk);
                    resA.on('end', () => console.log('Avail:', resA.statusCode, strA));
                }
            );
            availReq.write(availData);
            availReq.end();
        });
    }
);
loginReq.write(loginData);
loginReq.end();
