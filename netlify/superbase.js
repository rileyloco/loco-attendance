const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qfgmkcbbbiiovmmmfipa.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

exports.handler = async (event) => {
  const { action, payload } = JSON.parse(event.body);

  try {
    switch (action) {
      case 'upsertCustomers':
        return await upsertCustomers(payload);
      case 'fetchCustomers':
        return await fetchCustomers();
      case 'saveAttendanceState':
        return await saveAttendanceState(payload.className, payload.student);
      case 'loadAttendanceState':
        return await loadAttendanceState(payload.className);
      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Invalid action' }),
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        };
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    };
  }
};

async function upsertCustomers(rows) {
  const { data, error } = await supabase
    .from('customers')
    .upsert(rows, { onConflict: 'customer_id' });
  if (error) {
    throw new Error(error.message);
  }
  return {
    statusCode: 200,
    body: JSON.stringify({ data }),
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  };
}

async function fetchCustomers() {
  const { data, error } = await supabase.from('customers').select('*');
  if (error) {
    throw new Error(error.message);
  }
  return {
    statusCode: 200,
    body: JSON.stringify(data || []),
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  };
}

async function saveAttendanceState(className, student) {
  console.log('Saving attendance for:', className, student);
  const { data: existing, error: fetchError } = await supabase
    .from('attendance')
    .select('*')
    .eq('class_name', className)
    .eq('customer_id', student.customer_id)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    throw new Error(fetchError.message);
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
      throw new Error(error.message);
    }
  } else {
    console.log('Inserting new attendance:', attendanceRecord);
    const { error } = await supabase
      .from('attendance')
      .insert(attendanceRecord);
    if (error) {
      throw new Error(error.message);
    }
  }
  return {
    statusCode: 200,
    body: JSON.stringify(true),
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  };
}

async function loadAttendanceState(className) {
  console.log('Loading attendance for className:', className);
  const { data, error } = await supabase
    .from('attendance')
    .select('*, customers(first_name, last_name)')
    .eq('class_name', className);

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    console.log('No attendance records found for className:', className);
    return {
      statusCode: 200,
      body: JSON.stringify([]),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    };
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
  return {
    statusCode: 200,
    body: JSON.stringify(result),
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  };
}