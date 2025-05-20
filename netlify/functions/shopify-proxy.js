exports.handler = async (event) => {
  console.log('Starting shopify-proxy function');
  const SHOPIFY_STORE = process.env.SHOPIFY_STORE_URL || 'fnatn0-bb.myshopify.com';
  const SHOPIFY_TOKEN = process.env.SHOPIFY_API_TOKEN;
  const API_VERSION = '2024-04';
  const SINCE = '2024-01-01T00:00:00Z';

  // Handle CORS preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': 'https://loco-attendance.netlify.app', // Corrected URL
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: ''
    };
  }

  if (!SHOPIFY_TOKEN) {
    console.error('Shopify API token is not set in environment variables');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Shopify API token is not set in environment variables' }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://loco-attendance.netlify.app'
      }
    };
  }

  try {
    console.log('Fetching orders from Shopify');
    const shopifyUrl = `https://${SHOPIFY_STORE}/admin/api/${API_VERSION}/orders.json?status=any&limit=50&created_at_min=${SINCE}`;
    console.log('Shopify URL:', shopifyUrl);
    console.log('Using token:', SHOPIFY_TOKEN);

    let response;
    let retries = 0;
    const MAX_RETRIES = 3;
    const BASE_DELAY = 1000;

    while (retries < MAX_RETRIES) {
      response = await fetch(shopifyUrl, {
        headers: {
          'X-Shopify-Access-Token': SHOPIFY_TOKEN
        }
      });

      if (response.status === 429) {
        const delay = BASE_DELAY * Math.pow(2, retries);
        console.warn(`Rate limit hit, retrying after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        retries++;
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Shopify API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      break;
    }

    if (retries === MAX_RETRIES) {
      throw new Error('Failed to fetch Shopify orders after maximum retries due to rate limits');
    }

    const data = await response.json();
    console.log('Received Shopify data:', data);

    return {
      statusCode: 200,
      body: JSON.stringify(data.orders || []),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://loco-attendance.netlify.app'
      }
    };
  } catch (error) {
    console.error('Error in shopify-proxy:', error.message, error.stack);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://loco-attendance.netlify.app'
      }
    };
  }
};