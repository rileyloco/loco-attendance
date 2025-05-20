/* ------------------------- Supabase Client Setup ------------------------ */
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2.45.4';
// Hardcode Supabase URL and key for now (we'll fix this later)
const SUPABASE_URL = window.env?.SUPABASE_URL || 'https://qfgmkcbbbiiovmmmfipa.supabase.co';
const SUPABASE_KEY = window.env?.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/* ------------------------- Database Functions ------------------------ */


// Upsert customers into the 'customers' table
export const upsertCustomers = async (rows) => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .upsert(rows, { onConflict: 'customer_id' });
    if (error) {
      console.error('Supabase error:', error);
      return { error };
    }
    return { data };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { error: { message: err.message } };
  }
};

// Fetch all customers from the 'customers' table
export const fetchCustomers = async () => {
  const { data, error } = await supabase.from('customers').select('*');
  if (error) {
    console.error('Fetch error:', error);
    return [];
  }
  return data || [];
};

// Export the Supabase client for use in other files (e.g., storage.js)
export { supabase };