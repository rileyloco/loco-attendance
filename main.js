// --- 1. Constants and Data Setup --- //
const weeks = 5; // Number of weeks per term

// --- 2. Save/Load Utilities --- //
import { saveOrders,
         loadOrders,
         saveAttendanceState,
         loadAttendanceState } from './storage.js';

         import { renderTable } from './table.js';  // instead of exporting it here


/* keep your other globals (weeks, DAY_CLASS_MAP, …) here */


// --- 1A. Day-Class Mapping --- //
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

// Renders class buttons and immediately displays default class table
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

  // ONE-WAY click (never hides table)
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




// --- 3. Attendance Merge: Appends Only, Never Deletes --- //
function updateClassAttendanceWithOrders(orders) {
  const prevAttendance = loadAttendanceState();

  orders.forEach(order => {
    // Grab list of classes from 'Classes' (or 'classes') column, support multi-class
    const classList = (order.Classes || order.classes || "")
      .split(",")
      .map(c => c.trim())
      .filter(Boolean);

    classList.forEach(className => {
      if (!className) return;
      if (!prevAttendance[className]) prevAttendance[className] = [];

      const newName =
        `${order["First Name"] || order.first_name || ""} ${order["Last Name"] || order.last_name || ""}`.trim();
      const newRole = order.Role || order.role || "";
      // Avoid duplicates by (name + role), case-insensitive
      const exists = prevAttendance[className].some(
        s =>
          s.name.toLowerCase() === newName.toLowerCase() &&
          (s.role || "").toLowerCase() === newRole.toLowerCase()
      );
      if (!exists) {
        prevAttendance[className].push({
          name: newName,
          role: newRole,
          email: order.Email || order.email || "",
          paid: order.Paid || order.paid || "",
          weeks: Array(weeks).fill(false)
        });
      }
    });
  });

  saveAttendanceState(prevAttendance);
}

// --- 4. Attendance Table Renderer --- //


// --- 6. Refresh Button Handler: Updates Orders + Attendance --- //
const SCRIPT_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzGnzTznTqHE2MUM9JJSk_8v76Lk6Bfi75lvoKoBhHXJzXm5BJrzHCl4QQruSbBCT3v/exec";
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQJpVqom-DRtqLFPdn_ZczS_X13953Lt1HwbaupPi8SKX6pFtRCzZLMd9mLM5DLQCTobc5WpVKhU-p9/pub?gid=2007168005&single=true&output=csv";

document.getElementById('refresh-orders-btn').addEventListener('click', () => {
  fetch(SCRIPT_WEB_APP_URL)
    .then(res => res.text())
    .then(txt => {
      setTimeout(() => {
        fetch(SHEET_CSV_URL)
          .then(response => response.text())
          .then(csvText => {
            Papa.parse(csvText, {
              header: true,
              skipEmptyLines: true,
              complete: function (results) {
                const data = results.data;
                saveOrders(data);
                updateClassAttendanceWithOrders(data); // APPENDS only, never deletes
                alert(`✅ Synced: ${data.length} orders imported from Google Sheet!\nAttendance updated (new students appended only).`);
              },
              error: function (error) {
                alert('❌ Error parsing Sheet CSV: ' + error.message);
              }
            });
          })
          .catch(err => {
            alert("❌ Could not fetch the sheet. Make sure it's published and accessible.");
          });
      }, 2500);
    })
    .catch(err => {
      alert("❌ Could not trigger the update script. Check your Apps Script deployment and permissions.");
    });
});

// --- On page load, set up filter bar listeners ---
document.addEventListener('DOMContentLoaded', function () {
  ['filter-name', 'filter-role', 'attendance-search'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', function () {
        // Always re-render the table for the currently visible class!
        if (currentVisibleClass) renderClassAttendanceTable(currentVisibleClass);
      });
    }
  });

  // Render class buttons for default day on load (this will also set currentVisibleClass)
  renderClassButtons(currentDay);

  // Set up day dropdown change handler
  document.getElementById('day-select').addEventListener('change', function() {
    currentDay = this.value;
    renderClassButtons(currentDay); // This will update class buttons and table for new day
  });
});

let sortState = { key: 'name', asc: true };   // default alphabetical


function renderClassAttendanceTable(className) {
  const state = loadAttendanceState();
  let students = state[className] || [];

  /* ---------- filters ---------- */
  const nameFilter = (document.getElementById('filter-name')?.value || '')
                      .trim().toLowerCase();
  const roleFilter = document.getElementById('filter-role')?.value || '';
  const searchFilter = (document.getElementById('attendance-search')?.value || '')
                       .trim().toLowerCase();

  students = students.filter(s => {
    if (nameFilter && !s.name.toLowerCase().includes(nameFilter)) return false;
    if (roleFilter && s.role !== roleFilter)                     return false;
    if (searchFilter) {
      const hay = `${s.name} ${s.role} ${s.email} ${s.paid}`.toLowerCase();
      if (!hay.includes(searchFilter)) return false;
    }
    return true;
  });

  /* ---------- sorting ---------- */
  if (sortState.key) {
    students.sort((a, b) => {
      const A = (a[sortState.key] || '').toLowerCase();
      const B = (b[sortState.key] || '').toLowerCase();
      return sortState.asc ? A.localeCompare(B) : B.localeCompare(A);
    });
  }

  /* ---------- prep data for generic renderer ---------- */
  const headers = ['Name', 'Role',
                   'Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'];

  const rows = students.map(stu => [
    stu.name,
    stu.role || '',
    ...stu.weeks            // [true,false,false,…] for the five check-boxes
  ]);

  /* ---------- call the helper ---------- */
  renderTable({
    containerId: 'attendance-table-section',
    headers,
    rows,
    options: {
      checkboxCol: 2,                     // first “Week” column gets check-boxes
      sortState: {                        // convert key string → column index
        key: headers.indexOf(
              sortState.key === 'name' ? 'Name' : 'Role'),
        asc: sortState.asc
      },
      onCheckbox(rowIdx, colIdx, checked) {
        const week = colIdx - 2;          // convert column to week index 0-4
        students[rowIdx].weeks[week] = checked;
        state[className][rowIdx].weeks[week] = checked;
        saveAttendanceState(state);
      }
    }
  });

  /* ---------- header click events (name & role) ---------- */
  const wrap = document.getElementById('attendance-table-section');
  wrap.querySelector('th[data-col="0"]').onclick = () => {   // Name col
    toggleSort('name');
  };
  wrap.querySelector('th[data-col="1"]').onclick = () => {   // Role col
    toggleSort('role');
  };

  function toggleSort(key) {
    if (sortState.key === key) sortState.asc = !sortState.asc;
    else sortState = { key, asc: true };
    renderClassAttendanceTable(className);
  }
}


// Listen for name filter changes
document.getElementById('filter-name').addEventListener('input', function() {
  if (currentVisibleClass) renderClassAttendanceTable(currentVisibleClass);
});
