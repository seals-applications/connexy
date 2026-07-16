global.WebSocket = class {};

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://snoccydfbrbxupembsar.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNub2NjeWRmYnJieHVwZW1ic2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MTY0MzgsImV4cCI6MjA5NTk5MjQzOH0.7_4ac3jn0QOZ4wAFGgQSis0OIM6CEGCyQyoM7yspSPY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const candidateRpcs = [
  'exec_sql',
  'run_sql',
  'execute_sql',
  'sql',
  'query',
  'exec'
];

async function check() {
  for (const rpc of candidateRpcs) {
    const { data, error } = await supabase.rpc(rpc, { sql: 'SELECT 1' });
    if (error && error.message.includes('does not exist')) {
      continue;
    }
    console.log(`RPC '${rpc}' result:`, { data, error });
  }
}

check();
