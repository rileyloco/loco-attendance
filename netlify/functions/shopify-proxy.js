// Netlify Function to proxy Shopify API requests
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qfgmkcbbbiiovmmmfipa.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmZ21rY2JiYmlpb3ZtbW1maXBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1NjQzODcsImV4cCI6MjA2MzE0MDM4N30.0adnE0HaoO5JqkuXku9WT1n2DDJEVKYcmSvT49gw1_I';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

exports.handler = async (event) => {
  const SHOPIFY_STORE = process.env.SHOPIFY_STORE_URL || 'fnatn0-bb.myshopify.com';
  const SHOPIFY_TOKEN = process.env.SHOPIFY_API_TOKEN;
  const API_VERSION = '2024-04';
  const SINCE = '2024-01-01T00:00:00Z';

  if (!SHOPIFY_TOKEN) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Shopify API token is not set in environment variables' }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    };
  }

  try {
    const shopifyUrl = `https://${SHOPIFY_STORE}/admin/api/${API_VERSION}/orders.json?status=any&limit=250&created_at_min=${SINCE}`;
    const orders = await fetchAllOrders(shopifyUrl, SHOPIFY_TOKEN);
    const mappedOrders = await mapOrders(orders);

    return {
      statusCode: 200,
      body: JSON.stringify(mappedOrders),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    };
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

async function fetchAllOrders(url, token) {
  const allOrders = [];
  let currentUrl = url;

  while (currentUrl) {
    const response = await fetch(currentUrl, {
      headers: {
        'X-Shopify-Access-Token': token
      }
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    allOrders.push(...data.orders);

    const linkHeader = response.headers.get('Link');
    const nextLink = linkHeader?.match(/<([^>]+)>; rel="next"/);
    currentUrl = nextLink ? nextLink[1] : null;
  }

  return allOrders;
}

async function mapOrders(orders) {
  const map = {};

  for (const order of orders) {
    const date = order.created_at.split('T')[0];
    const paid = order.financial_status === 'paid';
    const customerId = order.customer?.id?.toString() || '';

    const refundedIds = new Set();
    (order.refunds || []).forEach(refund => {
      (refund.refund_line_items || []).forEach(item => {
        if (item.line_item_id) refundedIds.add(item.line_item_id);
      });
    });

    for (const item of order.line_items) {
      if (refundedIds.has(item.id)) continue;

      const variantTitle = item.variant_title || '';
      const productTitle = item.title || '';

      const isCourse = /term\s*2a/i.test(variantTitle);
      const isBundle = /bundle/i.test(productTitle) && /term\s*2/i.test(variantTitle);
      if (!(isCourse || isBundle)) continue;

      const role = variantTitle.toLowerCase().includes('leader') ? 'Leader'
                 : variantTitle.toLowerCase().includes('follower') ? 'Follower' : '';

      const classes = deriveClasses(productTitle);
      const key = `${customerId}||${role}`;

      if (!map[key]) {
        // Fetch customer details from Supabase using customer_id
        let customerDetails = { first_name: '', last_name: '', email: '' };
        if (customerId) {
          const { data: customer, error } = await supabase
            .from('customers')
            .select('first_name, last_name, email')
            .eq('customer_id', customerId)
            .single();

          if (error) {
            console.error('Error fetching customer from Supabase:', error);
          } else if (customer) {
            customerDetails = customer;
          }
        }

        map[key] = {
          customerId,
          role,
          paid,
          date,
          order_id: order.id.toString(),
          product_title: productTitle,
          variant_title: variantTitle,
          classes: new Set(),
          note: [order.note, order.customer?.note].filter(Boolean).join(' | '),
          first_name: customerDetails.first_name || '',
          last_name: customerDetails.last_name || '',
          email: customerDetails.email || ''
        };
      }

      classes.forEach(cls => map[key].classes.add(cls));
    }
  }

  const rows = [];
  for (const data of Object.values(map)) {
    const allClasses = Array.from(data.classes);
    const coreClasses = allClasses.filter(c => !['Body Movement', 'Shines'].includes(c));
    const soloClasses = allClasses.filter(c => ['Body Movement', 'Shines'].includes(c));

    if (coreClasses.length > 0) {
      rows.push({
        'First Name': data.first_name,
        'Last Name': data.last_name,
        'Email': data.email,
        'Role': data.role,
        'Classes': coreClasses.join(', '),
        'Paid': data.paid,
        'order_id': data.order_id,
        'order_date': data.date,
        'customer_id': data.customerId,
        'product_title': data.product_title,
        'variant_title': data.variant_title,
        'financial_status': data.paid ? 'paid' : 'pending',
        'Notes': data.note || ''
      });
    }

    if (soloClasses.length > 0) {
      rows.push({
        'First Name': data.first_name,
        'Last Name': data.last_name,
        'Email': data.email,
        'Role': '',
        'Classes': soloClasses.join(', '),
        'Paid': data.paid,
        'order_id': data.order_id,
        'order_date': data.date,
        'customer_id': data.customerId,
        'product_title': data.product_title,
        'variant_title': data.variant_title,
        'financial_status': data.paid ? 'paid' : 'pending',
        'Notes': data.note || ''
      });
    }
  }

  return rows;
}

function deriveClasses(title) {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('platinum bundle') || lowerTitle.includes('unlimited bundle')) {
    return ['Level 1', 'Level 2', 'Level 3', 'Body Movement', 'Shines'];
  }
  if (lowerTitle.includes('level 1')) return ['Level 1'];
  if (lowerTitle.includes('level 2')) return ['Level 2'];
  if (lowerTitle.includes('level 3')) return ['Level 3'];
  if (lowerTitle.includes('level 4')) return ['Level 4'];
  if (lowerTitle.includes('shines')) return ['Shines'];
  if (lowerTitle.includes('body movement')) return ['Body Movement'];
  return [];
}