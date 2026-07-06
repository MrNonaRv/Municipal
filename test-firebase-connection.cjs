const http = require('http');

console.log('Testing Firestore connection ...');
http.get('http://127.0.0.1:3000/api/debug/firebase-test', (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    console.log(`Response Code: ${res.statusCode}`);
    console.log('Response:', data);
    process.exit(0);
  });
}).on('error', (err) => {
  console.error('Request failed:', err.message);
  process.exit(1);
});
