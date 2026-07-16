global.WebSocket = class {};

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://snoccydfbrbxupembsar.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNub2NjeWRmYnJieHVwZW1ic2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MTY0MzgsImV4cCI6MjA5NTk5MjQzOH0.7_4ac3jn0QOZ4wAFGgQSis0OIM6CEGCyQyoM7yspSPY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data: data2, error: error2 } = await supabase.from('chat_messages').select('*').limit(1);
  console.log('chat_messages select result:', { data: data2, error: error2 });
  
  const { data: data3, error: error3 } = await supabase.from('messages').select('*').limit(1);
  console.log('messages select result:', { data: data3, error: error3 });

  const { data: data4, error: error4 } = await supabase.from('chats').select('*').limit(1);
  console.log('chats select result:', { data: data4, error: error4 });
}

check();
