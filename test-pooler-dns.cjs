const dns = require('dns');

const host = 'aws-0-ap-southeast-1.pooler.supabase.com';

dns.resolve4(host, (err, addresses) => {
  console.log('IPv4 addresses:', err ? err.message : addresses);
});

dns.resolve6(host, (err, addresses) => {
  console.log('IPv6 addresses:', err ? err.message : addresses);
});
