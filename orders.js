import { loadOrders }    from './storage.js';
import { renderTable } from './table.js';  // remove the ./main.js import



/* ---------- 1. load & state ---------- */
let ORDERS = loadOrders();
let sortOrder = {};    // remembers asc/desc per column

/* ---------- 2. main render ---------- */
function showOrders(list){
  if(!list.length){
    document.getElementById('orders-table-section').innerHTML =
      "<p style='color:#b87;'>No orders loaded.</p>";
    return;
  }
  const headers = Object.keys(list[0]);
  const rows    = list.map(o=>headers.map(h=>o[h]));

  renderTable({
    containerId:'orders-table-section',
    headers,
    rows,
    options:{ sortState:null }
  });

  headers.forEach((h,idx)=>{
    document.querySelector(`#orders-table-section th[data-col='${idx}']`)
      .onclick = ()=> sortTable(idx, headers);
  });
}

/* ---------- 3. sort ---------- */
function sortTable(idx, headers){
  const col = headers[idx];
  sortOrder[col] = !sortOrder[col];
  ORDERS.sort((a,b)=>{
    const A=(a[col]||'').toString().toLowerCase();
    const B=(b[col]||'').toString().toLowerCase();
    if(!isNaN(Date.parse(A)) && !isNaN(Date.parse(B)))
      return sortOrder[col]? new Date(A)-new Date(B) : new Date(B)-new Date(A);
    if(!isNaN(+A) && !isNaN(+B))
      return sortOrder[col]? +A-+B : +B-+A;
    return sortOrder[col]? A.localeCompare(B):B.localeCompare(A);
  });
  showOrders(ORDERS);
}

/* ---------- 4. search ---------- */
document.getElementById('orders-search').oninput = e=>{
  const q=e.target.value.trim().toLowerCase();
  if(!q) return showOrders(ORDERS);
  const filtered = ORDERS.filter(o =>
    Object.values(o).some(v=>(v||'').toString().toLowerCase().includes(q))
  );
  showOrders(filtered);
};

/* ---------- 5. init ---------- */
showOrders(ORDERS);
