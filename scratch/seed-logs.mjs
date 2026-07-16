const url = 'https://snoccydfbrbxupembsar.supabase.co/rest/v1/staffs';
const apikey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNub2NjeWRmYnJieHVwZW1ic2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MTY0MzgsImV4cCI6MjA5NTk5MjQzOH0.7_4ac3jn0QOZ4wAFGgQSis0OIM6CEGCyQyoM7yspSPY';

async function seed() {
  console.log('Fetching staffs...');
  const response = await fetch(url, {
    headers: {
      'apikey': apikey,
      'Authorization': `Bearer ${apikey}`
    }
  });
  const staffs = await response.json();
  console.log(`Found ${staffs.length} staffs. Seeding attendance logs...`);

  for (const staff of staffs) {
    const existingTrainings = staff.completed_trainings || [];
    const attendanceLogs = existingTrainings.filter(t => t.startsWith('ATTENDANCE_LOG_'));
    
    // We want to force seeding 15 logs, so let's clean up existing attendance logs first
    const cleanTrainings = existingTrainings.filter(t => !t.startsWith('ATTENDANCE_LOG_'));
    
    // Generate 15 random logs for April, May, and June 2026
    const newLogs = [];
    const times = ['08:50', '08:53', '08:55', '08:57', '08:58', '08:59', '09:00', '09:01', '09:02', '09:03', '09:05', '09:08'];
    const dates = [
      '2026-06-05', '2026-06-04', '2026-06-03', '2026-06-02', '2026-06-01',
      '2026-05-29', '2026-05-28', '2026-05-27', '2026-05-26', '2026-05-25',
      '2026-05-22', '2026-05-21', '2026-05-20', '2026-05-19', '2026-05-18',
      '2026-05-15', '2026-05-14', '2026-05-13', '2026-05-12', '2026-05-11'
    ];
    
    // Randomly select 15 dates
    const shuffled = [...dates].sort(() => 0.5 - Math.random());
    const selectedDates = shuffled.slice(0, 15);
    selectedDates.forEach(date => {
      const randTime = times[Math.floor(Math.random() * times.length)];
      const isLate = randTime > '09:00';
      newLogs.push(`ATTENDANCE_LOG_${date}_${randTime}_${isLate ? 'LATE' : 'OK'}`);
    });

    const updatedTrainings = [...cleanTrainings, ...newLogs];

    console.log(`Seeding staff "${staff.name}" (${staff.id}) with ${newLogs.length} logs...`);

    const updateResponse = await fetch(`${url}?id=eq.${staff.id}`, {
      method: 'PATCH',
      headers: {
        'apikey': apikey,
        'Authorization': `Bearer ${apikey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        completed_trainings: updatedTrainings
      })
    });

    if (!updateResponse.ok) {
      console.error(`Failed to update ${staff.name}:`, await updateResponse.text());
    } else {
      console.log(`Successfully updated ${staff.name}.`);
    }
  }

  console.log('Done seeding!');
}

seed();
