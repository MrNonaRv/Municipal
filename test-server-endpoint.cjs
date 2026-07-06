const http = require('http');

console.log('Sending request to local dev server /api/debug/db-status ...');
http.get('http://127.0.0.1:3000/api/debug/db-status', (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    console.log(`Response Code: ${res.statusCode}`);
    try {
      const parsed = JSON.parse(data);
      console.log('Server response:', JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('Raw Response:', data);
    }
    process.exit(0);
  });
}).on('error', (err) => {
  console.error('Request failed:', err.message);
  process.exit(1);
});
