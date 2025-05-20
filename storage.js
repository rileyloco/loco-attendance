const ORDERS_KEY = 'locomojo_orders';
const ATTENDANCE_KEY = 'locomojo_class_attendance';

export function saveOrders(arr) {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(arr));
}

export function loadOrders() {
  try {
    return JSON.parse(localStorage.getItem(ORDERS_KEY)) || [];
  } catch {
    return [];
  }
}

export async function saveAttendanceState(className, student) {
  console.log('Saving attendance for:', className, student);
  try {
    const response = await fetch('/.netlify/functions/supabase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'saveAttendanceState', payload: { className, student } })
    });
    const result = await response.json();
    if (response.status !== 200) {
      console.error('Error saving attendance:', result.error);
      return false;
    }
    return result;
  } catch (err) {
    console.error('Unexpected error:', err);
    return false;
  }
}

export async function loadAttendanceState(className) {
  console.log('Loading attendance for className:', className);
  try {
    const response = await fetch('/.netlify/functions/supabase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'loadAttendanceState', payload: { className } })
    });
    const result = await response.json();
    if (response.status !== 200) {
      console.error('Error loading attendance:', result.error);
      return [];
    }
    return result;
  } catch (err) {
    console.error('Unexpected error:', err);
    return [];
  }
}