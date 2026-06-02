

async function insert() {
  const data = [
    {id:'sigma', name:'株式会社シグマ通信', login_id:'sigma', password:'pass', role:'contractor'},
    {id:'alpha', name:'株式会社アルファ', login_id:'alpha', password:'pass', role:'contractor'},
    {id:'beta', name:'ベータ株式会社', login_id:'beta', password:'pass', role:'contractor'},
    {id:'gamma', name:'合同会社ガンマ', login_id:'gamma', password:'pass', role:'contractor'},
    {id:'delta', name:'デルタ合同会社', login_id:'delta', password:'pass', role:'contractor'}
  ];

  const res = await fetch('https://snoccydfbrbxupembsar.supabase.co/rest/v1/companies', {
    method: 'POST',
    headers: {
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNub2NjeWRmYnJieHVwZW1ic2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MTY0MzgsImV4cCI6MjA5NTk5MjQzOH0.7_4ac3jn0QOZ4wAFGgQSis0OIM6CEGCyQyoM7yspSPY',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNub2NjeWRmYnJieHVwZW1ic2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MTY0MzgsImV4cCI6MjA5NTk5MjQzOH0.7_4ac3jn0QOZ4wAFGgQSis0OIM6CEGCyQyoM7yspSPY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  console.log(res.status, await res.text());
}
insert();
