const http = require('http');

const data = JSON.stringify({
  id: 'EMP-LARGE',
  firstName: 'A'.repeat(2 * 1024 * 1024)
});

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/employees',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
}, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.on('data', (chunk) => console.log(`BODY: ${chunk}`));
});

req.on('error', (e) => console.error(`problem with request: ${e.message}`));
req.write(data);
req.end();
