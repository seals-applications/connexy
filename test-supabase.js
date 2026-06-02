import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://snoccydfbrbxupembsar.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNub2NjeWRmYnJieHVwZW1ic2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MTY0MzgsImV4cCI6MjA5NTk5MjQzOH0.7_4ac3jn0QOZ4wAFGgQSis0OIM6CEGCyQyoM7yspSPY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabase.from('companies').select('*');
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Companies:', data);
  }
}

check();
