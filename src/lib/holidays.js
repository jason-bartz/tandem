// Major US holidays and special days for themed puzzles
// Dates are in MM-DD format (without year) for recurring holidays
// or full dates for specific year holidays

export const holidays = {
  // Fixed date holidays (same date every year)
  '01-01': "New Year's Day",
  '01-15': 'MLK Jr. Day',
  '02-02': 'Groundhog Day',
  '02-14': "Valentine's Day",
  '03-17': "St. Patrick's Day",
  '04-01': "April Fool's Day",
  '04-22': 'Earth Day',
  '05-05': 'Cinco de Mayo',
  '06-19': 'Juneteenth',
  '07-04': 'Independence Day',
  '08-26': "Women's Equality Day",
  '09-11': 'Patriot Day',
  '10-31': 'Halloween',
  '11-11': "Veterans Day",
  '12-24': 'Christmas Eve',
  '12-25': 'Christmas',
  '12-31': "New Year's Eve",
};

// Variable date holidays for 2025-2026
export const variableHolidays = {
  // 2025
  '2025-02-17': "Presidents' Day",
  '2025-03-09': 'Daylight Saving',
  '2025-04-20': 'Easter',
  '2025-05-11': "Mother's Day",
  '2025-05-26': 'Memorial Day',
  '2025-06-15': "Father's Day",
  '2025-09-01': 'Labor Day',
  '2025-10-13': 'Columbus Day',
  '2025-11-02': 'Fall Back',
  '2025-11-27': 'Thanksgiving',
  '2025-11-28': 'Black Friday',
  '2025-12-02': 'Cyber Monday',
  
  // 2026
  '2026-02-16': "Presidents' Day",
  '2026-03-08': 'Daylight Saving',
  '2026-04-05': 'Easter',
  '2026-05-10': "Mother's Day",
  '2026-05-25': 'Memorial Day',
  '2026-06-21': "Father's Day",
  '2026-09-07': 'Labor Day',
  '2026-10-12': 'Columbus Day',
  '2026-11-01': 'Fall Back',
  '2026-11-26': 'Thanksgiving',
  '2026-11-27': 'Black Friday',
  '2026-11-30': 'Cyber Monday',
};

// Get holiday for a specific date
export function getHoliday(date) {
  // Check if date is a string or Date object
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  
  // Check variable holidays first (full date match)
  if (variableHolidays[dateStr]) {
    return variableHolidays[dateStr];
  }
  
  // Check fixed holidays (month-day match)
  const monthDay = dateStr.substring(5); // Get MM-DD part
  if (holidays[monthDay]) {
    return holidays[monthDay];
  }
  
  return null;
}

// Get all holidays for a specific month
export function getHolidaysForMonth(year, month) {
  const monthHolidays = {};
  const monthStr = String(month + 1).padStart(2, '0');
  
  // Check fixed holidays
  Object.entries(holidays).forEach(([date, name]) => {
    if (date.startsWith(monthStr)) {
      const day = parseInt(date.split('-')[1]);
      monthHolidays[day] = name;
    }
  });
  
  // Check variable holidays for this specific year-month
  const yearMonth = `${year}-${monthStr}`;
  Object.entries(variableHolidays).forEach(([date, name]) => {
    if (date.startsWith(yearMonth)) {
      const day = parseInt(date.split('-')[2]);
      monthHolidays[day] = name;
    }
  });
  
  return monthHolidays;
}