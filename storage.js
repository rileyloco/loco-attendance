import { supabase } from './db.js';

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
  const { data: existing, error: fetchError } = await supabase
    .from('attendance')
    .select('*')
    .eq('class_name', className)
    .eq('customer_id', student.customer_id)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error('Error fetching existing attendance:', fetchError.message, fetchError.details, fetchError.hint);
    return false;
  }

  const attendanceRecord = {
    customer_id: student.customer_id,
    class_name: className,
    role: student.role || '',
    'week 1': student['week 1'] || false,
    'week 2': student['week 2'] || false,
    'week 3': student['week 3'] || false,
    'week 4': student['week 4'] || false,
    'week 5': student['week 5'] || false,
    notes: student.notes || ''
  };

  if (existing) {
    console.log('Updating existing attendance:', existing.id, attendanceRecord);
    const { error } = await supabase
      .from('attendance')
      .update(attendanceRecord)
      .eq('id', existing.id);
    if (error) {
      console.error('Error updating attendance:', error.message, error.details, error.hint);
      return false;
    }
  } else {
    console.log('Inserting new attendance:', attendanceRecord);
    const { error } = await supabase
      .from('attendance')
      .insert(attendanceRecord);
    if (error) {
      console.error('Error inserting attendance:', error.message, error.details, error.hint);
      return false;
    }
  }
  return true;
}

export async function loadAttendanceState(className) {
  console.log('Loading attendance for className:', className);
  const { data, error } = await supabase
    .from('attendance')
    .select('*, customers(first_name, last_name)')
    .eq('class_name', className);

  if (error) {
    console.error('Error loading attendance:', error);
    console.error('Error details:', error.message, error.details, error.hint);
    return [];
  }

  if (!data || data.length === 0) {
    console.log('No attendance records found for className:', className);
    return [];
  }

  const result = data.map(record => {
    console.log('Mapping record:', record);
    return {
      customer_id: record.customer_id,
      name: `${record.customers?.first_name || ''} ${record.customers?.last_name || ''}`.trim(),
      role: record.role || '',
      'week 1': record['week 1'] || false,
      'week 2': record['week 2'] || false,
      'week 3': record['week 3'] || false,
      'week 4': record['week 4'] || false,
      'week 5': record['week 5'] || false,
      notes: record.notes || '',
      class_name: record.class_name
    };
  });

  console.log('loadAttendanceState result for', className, result);
  return result;
}