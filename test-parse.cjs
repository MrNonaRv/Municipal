const parse = require('pg-connection-string').parse;

const url1 = "postgresql://postgres:[Olanoko15152929]@db.oxtjlhcwibieeuwbhnyj.supabase.co:5432/postgres";
const url2 = "postgresql://postgres:%5BOlanoko15152929%5D@db.oxtjlhcwibieeuwbhnyj.supabase.co:5432/postgres";
const url3 = "postgresql://postgres:Olanoko15152929@db.oxtjlhcwibieeuwbhnyj.supabase.co:5432/postgres";

console.log("url1:", parse(url1));
console.log("url2:", parse(url2));
console.log("url3:", parse(url3));
