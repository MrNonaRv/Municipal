const dns = require('dns');

dns.resolve6('db.oxtjlhcwibieeuwbhnyj.supabase.co', (err, addresses) => {
  if (err) {
    console.error('Error AAAA:', err);
  } else {
    console.log('AAAA addresses:', addresses);
  }
});
