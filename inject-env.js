const fs = require('fs');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error('Error: Missing required environment variables (SUPABASE_URL or SUPABASE_KEY)');
  process.exit(1);
}

const env = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_KEY
};

const script = `window.env = ${JSON.stringify(env)};`;
fs.writeFileSync('env.js', script);
console.log('Environment variables injected into env.js');