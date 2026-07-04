const dns = require('dns');

dns.resolve4('db.oxtjlhcwibieeuwbhnyj.supabase.co', (err, addresses) => {
  console.log('IPv4 addresses:', err ? err.message : addresses);
});

dns.resolve6('db.oxtjlhcwibieeuwbhnyj.supabase.co', (err, addresses) => {
  console.log('IPv6 addresses:', err ? err.message : addresses);
});

dns.lookup('db.oxtjlhcwibieeuwbhnyj.supabase.co', { all: true }, (err, addresses) => {
  console.log('Lookup all:', err ? err.message : addresses);
});
