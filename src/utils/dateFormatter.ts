export function formatJobDates(dateStr: string | undefined): string {
  if (!dateStr) return '';

  const dates = dateStr.split(',').map(d => d.trim()).sort();
  if (dates.length === 0) return '';
  if (dates.length === 1) return formatDate(dates[0]);

  // Convert to Date objects
  const dateObjs = dates.map(d => ({
    str: d,
    obj: new Date(d)
  }));

  let result = '';
  let streakStart = dateObjs[0];
  let streakEnd = dateObjs[0];
  let currentStreak = 1;

  for (let i = 1; i < dateObjs.length; i++) {
    const prev = dateObjs[i - 1];
    const curr = dateObjs[i];
    
    // Check if consecutive
    const diffTime = curr.obj.getTime() - prev.obj.getTime();
    const diffDays = diffTime / (1000 * 3600 * 24);

    if (diffDays === 1) {
      streakEnd = curr;
      currentStreak++;
    } else {
      result += formatStreak(streakStart, streakEnd, currentStreak) + ', ';
      streakStart = curr;
      streakEnd = curr;
      currentStreak = 1;
    }
  }
  
  result += formatStreak(streakStart, streakEnd, currentStreak);
  
  return result;
}

function formatDate(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}`;
}

function formatStreak(start: {str: string}, end: {str: string}, streak: number): string {
  if (streak === 1) {
    return formatDate(start.str);
  } else if (streak === 2) {
    return `${formatDate(start.str)}, ${formatDate(end.str)}`;
  } else {
    return `${formatDate(start.str)}〜${formatDate(end.str)}`;
  }
}
