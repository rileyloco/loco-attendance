export const upsertCustomers = async (rows) => {
  try {
    const response = await fetch('/.netlify/functions/supabase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'upsertCustomers', payload: rows })
    });
    const result = await response.json();
    if (response.status !== 200) {
      console.error('Supabase error:', result.error);
      return { error: { message: result.error } };
    }
    return { data: result.data };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { error: { message: err.message } };
  }
};

export const fetchCustomers = async () => {
  try {
    const response = await fetch('/.netlify/functions/supabase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'fetchCustomers' })
    });
    const result = await response.json();
    if (response.status !== 200) {
      console.error('Fetch error:', result.error);
      return [];
    }
    return result || [];
  } catch (err) {
    console.error('Unexpected error:', err);
    return [];
  }
};