const dns = require('dns');

dns.resolveAny('oxtjlhcwibieeuwbhnyj.supabase.co', (err, records) => {
  if (err) {
    console.error('Error:', err.message);
  } else {
    console.log('Records for oxtjlhcwibieeuwbhnyj.supabase.co:', records);
  }
});
