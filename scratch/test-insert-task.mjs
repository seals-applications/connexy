global.WebSocket = class {};

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://snoccydfbrbxupembsar.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNub2NjeWRmYnJieHVwZW1ic2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MTY0MzgsImV4cCI6MjA5NTk5MjQzOH0.7_4ac3jn0QOZ4wAFGgQSis0OIM6CEGCyQyoM7yspSPY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const taskId = 'test_chat_insert_' + Date.now();
  const row = {
    id: taskId,
    job_id: 'chat',
    job_title: 'Test Chat Title',
    client_name: 'Test Client',
    worker_name: 'Test Worker',
    price: 0,
    date: '2026-06-06',
    status: 'working',
    evaluations: { messages: [{ text: 'hello world', time: '12:00' }] }
  };
  
  console.log('Inserting row...');
  const { data, error } = await supabase.from('contract_tasks').insert([row]).select('*');
  console.log('Insert result:', { data, error });
  
  if (!error) {
    console.log('Deleting row...');
    const { error: delError } = await supabase.from('contract_tasks').delete().eq('id', taskId);
    console.log('Delete result:', delError);
  }
}

test();
