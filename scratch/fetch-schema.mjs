const supabaseUrl = 'https://snoccydfbrbxupembsar.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNub2NjeWRmYnJieHVwZW1ic2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MTY0MzgsImV4cCI6MjA5NTk5MjQzOH0.7_4ac3jn0QOZ4wAFGgQSis0OIM6CEGCyQyoM7yspSPY';

async function check() {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    });
    const schema = await res.json();
    console.log('Tables from OpenAPI schema definitions:', Object.keys(schema.definitions || {}));
  } catch (err) {
    console.error('Error fetching schema:', err);
  }
}

check();
