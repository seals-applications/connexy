global.WebSocket = class {};

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://snoccydfbrbxupembsar.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNub2NjeWRmYnJieHVwZW1ic2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MTY0MzgsImV4cCI6MjA5NTk5MjQzOH0.7_4ac3jn0QOZ4wAFGgQSis0OIM6CEGCyQyoM7yspSPY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const candidateTables = [
  'conversations',
  'chat_rooms',
  'chat_messages',
  'messages',
  'comments',
  'logs',
  'notifications',
  'chat_logs',
  'chats',
  'chatmessages'
];

async function check() {
  for (const table of candidateTables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error && error.code === 'PGRST205') {
      // Table does not exist
      continue;
    }
    console.log(`Table '${table}' result:`, { exists: !error || error.code !== 'PGRST205', error });
  }
}

check();
