import { loadOrders } from './storage.js';
import { renderTable } from './table.js';

/* ---------- 1. load & state ---------- */
let ORDERS = loadOrders();
console.log('Loaded ORDERS:', ORDERS);
let sortOrder = {};

/* ---------- 2. main render ---------- */
function showOrders(list) {
  if (!list.length || !list[0] || typeof list[0] !== 'object') {
    document.getElementById('orders-table-section').innerHTML =
      "<p style='color:#b87;'>No valid orders loaded.</p>";
    return;
  }
  const headers = Object.keys(list[0]);
  console.log('Table headers:', headers);
  const rows = list.map(o => headers.map(h => o[h]));

  renderTable({
    containerId: 'orders-table-section',
    headers,
    rows,
    options: { sortState: null }
  });

  setTimeout(() => {
    headers.forEach((h, idx) => {
      const thElement = document.querySelector(`#orders-table-section th[data-col='${idx}']`);
      if (thElement) {
        thElement.onclick = () => sortTable(idx, headers);
      } else {
        console.warn(`Table header for data-col='${idx}' not found in #orders-table-section`);
      }
    });
  }, 0);
}

/* ---------- 3. sort ---------- */
function sortTable(idx, headers) {
  const col = headers[idx];
  sortOrder[col] = !sortOrder[col];
  ORDERS.sort((a, b) => {
    const A = (a[col] || '').toString().toLowerCase();
    const B = (b[col] || '').toString().toLowerCase();
    if (!isNaN(Date.parse(A)) && !isNaN(Date.parse(B)))
      return sortOrder[col] ? new Date(A) - new Date(B) : new Date(B) - new Date(A);
    if (!isNaN(+A) && !isNaN(+B))
      return sortOrder[col] ? +A - +B : +B - +A;
    return sortOrder[col] ? A.localeCompare(B) : B.localeCompare(A);
  });
  showOrders(ORDERS);
}

/* ---------- 4. search ---------- */
document.getElementById('orders-search').oninput = e => {
  const q = e.target.value.trim().toLowerCase();
  if (!q) return showOrders(ORDERS);
  const filtered = ORDERS.filter(o =>
    Object.values(o).some(v => (v || '').toString().toLowerCase().includes(q))
  );
  showOrders(filtered);
};

/* ---------- 5. init ---------- */
showOrders(ORDERS);