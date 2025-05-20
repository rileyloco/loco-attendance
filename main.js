// --- Imports --- //
import { saveOrders, loadOrders, saveAttendanceState, loadAttendanceState } from './storage.js';
import { renderTable } from './table.js';
import { upsertCustomers, supabase } from './db.js';

// --- Constants and Data Setup --- //
const weeks = 5; // Number of weeks per term

// --- Day-Class Mapping --- //
const DAY_CLASS_MAP = {
  "Tuesday": [
    { label: "Level 1", value: "Level 1" },
    { label: "Level 2", value: "Level 2" },
    { label: "Level 3", value: "Level 3" }
  ],
  "Thursday": [
    { label: "Shines", value: "Shines" },
    { label: "Body Movement", value: "Body Movement" }
  ]
};

let currentDay = "Tuesday";
let currentVisibleClass = null;

// --- Functions --- //
async function updateClassAttendanceWithOrders(orders) {
  const prevAttendance = {};

  for (const className of Object.values(DAY_CLASS_MAP).flatMap(day => day.map(c => c.value))) {
    prevAttendance[className] = await loadAttendanceState(className);
    console.log('Initial prevAttendance for', className, prevAttendance[className]);
  }

  console.log('All prevAttendance keys:', Object.keys(prevAttendance));

  for (const order of orders) {
    const customerId = order.customer_id;
    console.log('Processing order for customer_id:', customerId);

    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('customer_id, first_name, last_name')
      .eq('customer_id', customerId)
      .single();

    if (customerError) {
      console.error('Customer fetch error for customer_id:', customerId, customerError);
      continue;
    }

    if (!customer) {
      console.log('No customer found for customer_id:', customerId);
      continue;
    }

    const newName = `${order["First Name"] || customer.first_name || ""} ${order["Last Name"] || customer.last_name || ""}`.trim();
    const role = order.Role || order.role || "";
    console.log('Found customer:', customerId, 'Name:', newName, 'Role:', role);

    const classList = (order.Classes || order.classes || "")
      .split(",")
      .map(c => {
        const trimmed = c.trim();
        const normalized = {
          'level 1': 'Level 1',
          'level 2': 'Level 2',
          'level 3': 'Level 3',
          'shines': 'Shines',
          'body movement': 'Body Movement',
          'level1': 'Level 1',
          'level2': 'Level 2',
          'level3': 'Level 3',
          'level 1 ': 'Level 1',
          'level 2 ': 'Level 2',
          'level 3 ': 'Level 3',
          'body movement ': 'Body Movement'
        }[trimmed.toLowerCase()] || trimmed;
        return normalized;
      })
      .filter(Boolean);

    console.log('Classes for customer:', customerId, classList);

    for (const className of classList) {
      if (!className) {
        console.log('Skipping empty className for customer:', customerId);
        continue;
      }

      let finalRole = role;
      if (['Body Movement', 'Shines'].includes(className)) {
        finalRole = "";
      }

      if (!prevAttendance[className]) {
        prevAttendance[className] = [];
      }

      if (!Array.isArray(prevAttendance[className])) {
        console.error('prevAttendance[className] is not an array:', className, prevAttendance[className]);
        prevAttendance[className] = [];
      }

      const exists = prevAttendance[className].some(
        s =>
          s.customer_id === customer.customer_id &&
          s.class_name === className &&
          (s.role || "").toLowerCase() === finalRole.toLowerCase()
      );

      if (exists) {
        console.log('Student already exists in attendance:', customer.customer_id, className, newName, finalRole);
        continue;
      }

      const newStudent = {
        customer_id: customer.customer_id,
        role: finalRole,
        notes: order.Notes || "",
        class_name: className,
        'week 1': false, // Match the exact column name with space
        'week 2': false,
        'week 3': false,
        'week 4': false,
        'week 5': false
      };
      console.log('Adding new student to attendance:', newStudent);
      const saved = await saveAttendanceState(className, newStudent);
      if (saved) {
        console.log('Successfully saved student to attendance:', customerId, className);
        prevAttendance[className].push(newStudent);
      } else {
        console.error('Failed to save student to attendance:', customerId, className);
      }
    }
  }
}

// --- Render Class Buttons --- //
function renderClassButtons(day) {
  const row = document.getElementById("class-buttons-row");
  row.innerHTML = "";

  DAY_CLASS_MAP[day].forEach(({ label, value }) => {
    const btn = document.createElement("button");
    btn.className = "class-btn";
    btn.textContent = label;
    btn.dataset.class = value;
    row.appendChild(btn);
  });

  const defaultCls = day === "Tuesday" ? "Level 1" : "Shines";
  const defBtn = [...row.children].find(b => b.dataset.class === defaultCls);
  if (defBtn) {
    defBtn.classList.add("active");
    currentVisibleClass = defaultCls;
    renderClassAttendanceTable(defaultCls);
  }

  row.querySelectorAll(".class-btn").forEach(btn => {
    btn.onclick = () => {
      const cls = btn.dataset.class;
      row.querySelectorAll(".class-btn")
          .forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentVisibleClass = cls;
      renderClassAttendanceTable(cls);
    };
  });
}

// --- Render Attendance Table --- //
async function renderClassAttendanceTable(className) {
  const students = await loadAttendanceState(className);

  const nameFilter = (document.getElementById('filter-name')?.value || '').trim().toLowerCase();
  const roleFilter = document.getElementById('filter-role')?.value || '';
  const searchFilter = (document.getElementById('attendance-search')?.value || '').trim().toLowerCase();

  const filteredStudents = students.filter(s => {
    if (nameFilter && !s.name.toLowerCase().includes(nameFilter)) return false;
    if (roleFilter && s.role !== roleFilter) return false;
    if (searchFilter) {
      const hay = `${s.name} ${s.role}`.toLowerCase();
      if (!hay.includes(searchFilter)) return false;
    }
    return true;
  });

  if (sortState.key) {
    filteredStudents.sort((a, b) => {
      const A = (a[sortState.key] || '').toLowerCase();
      const B = (b[sortState.key] || '').toLowerCase();
      return sortState.asc ? A.localeCompare(B) : B.localeCompare(A);
    });
  }

  const headers = ['Name', 'Role', 'Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'];
  const rows = filteredStudents.map(stu => [
    stu.name,
    stu.role || '',
    stu['week 1'],
    stu['week 2'],
    stu['week 3'],
    stu['week 4'],
    stu['week 5']
  ]);

  renderTable({
    containerId: 'attendance-table-section',
    headers,
    rows,
    options: {
      checkboxCol: 2,
      sortState: {
        key: headers.indexOf(sortState.key === 'name' ? 'Name' : 'Role'),
        asc: sortState.asc
      },
      onCheckbox: async (rowIdx, colIdx, checked) => {
        const week = colIdx - 2;
        filteredStudents[rowIdx][`week ${week + 1}`] = checked;
        await saveAttendanceState(className, filteredStudents[rowIdx]);
      }
    }
  });

  const wrap = document.getElementById('attendance-table-section');
  wrap.querySelector('th[data-col="0"]').onclick = () => {
    toggleSort('name');
  };
  wrap.querySelector('th[data-col="1"]').onclick = () => {
    toggleSort('role');
  };

  function toggleSort(key) {
    if (sortState.key === key) sortState.asc = !sortState.asc;
    else sortState = { key, asc: true };
    renderClassAttendanceTable(className);
  }
}

// --- Refresh Button Handler --- //
const SCRIPT_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzGnzTznTqHE2MUM9JJSk_8v76Lk6Bfi75lvoKoBhHXJzXm5BJrzHCl4QQruSbBCT3v/exec";
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQJpVqom-DRtqLFPdn_ZczS_X13953Lt1HwbaupPi8SKX6pFtRCzZLMd9mLM5DLQCTobc5WpVKhU-p9/pub?gid=2007168005&single=true&output=csv";

document.getElementById('refresh-orders-btn').addEventListener('click', async () => {
  try {
    const response = await fetch('/.netlify/functions/shopify-proxy');
    if (!response.ok) {
      throw new Error(`Netlify Function error: ${response.status} ${response.statusText}`);
    }
    const mappedOrders = await response.json();
    console.log('Orders before updating attendance:', mappedOrders);
    saveOrders(mappedOrders);
    await updateClassAttendanceWithOrders(mappedOrders);
    alert(`✅ Synced: ${mappedOrders.length} orders imported from Shopify!\nAttendance updated (new students appended only).`);
  } catch (err) {
    console.error('Error fetching Shopify orders:', err);
    alert(`❌ Error fetching orders from Shopify: ${err.message}`);
  }
});

// --- On Page Load --- //
document.addEventListener('DOMContentLoaded', function () {
  ['filter-name', 'filter-role', 'attendance-search'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', function () {
        if (currentVisibleClass) renderClassAttendanceTable(currentVisibleClass);
      });
    }
  });

  renderClassButtons(currentDay);

  document.getElementById('day-select').addEventListener('change', function() {
    currentDay = this.value;
    renderClassButtons(currentDay);
  });
});

let sortState = { key: 'name', asc: true };

// --- Listen for Name Filter Changes --- //
document.getElementById('filter-name').addEventListener('input', function() {
  if (currentVisibleClass) renderClassAttendanceTable(currentVisibleClass);
});

/* ------------------------- CUSTOMER CSV UPLOAD ------------------------ */
document.getElementById('upload-csv').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    delimiter: ',',
    complete: async ({ data }) => {
      console.log('Parsed CSV data:', data);
      const rows = data
        .map((r) => ({
          customer_id: Number(r['Customer ID']?.replace(/['"]/g, '').trim()),
          first_name: (r['First Name'] || '').trim(),
          last_name: (r['Last Name'] || '').trim(),
          email: (r['Email'] || '').trim().toLowerCase(),
        }))
        .filter((r) => {
          const isValid = r.customer_id && !isNaN(r.customer_id) && r.email;
          if (!isValid) {
            console.warn('Invalid row:', r);
          }
          return isValid;
        });

      if (!rows.length) {
        alert('❌ No valid rows found in this CSV.');
        return;
      }

      console.log('Processed rows:', rows);
      const { error } = await upsertCustomers(rows);
      if (error) {
        alert(`❌ Supabase error: ${error.message} (Code: ${error.code || 'Unknown'})`);
      } else {
        alert(`✅ ${rows.length} customer records saved to the database!`);
      }
    },
    error: (err) => {
      console.error('CSV parse error:', err);
      alert('❌ CSV parse error: ' + err.message);
    },
  });
});