/* =====================================================================
   STORAGE HELPERS  (shared by attendance + orders)
   ===================================================================== */
const ORDERS_KEY      = 'locomojo_orders';
const ATTENDANCE_KEY  = 'locomojo_class_attendance';

export function saveOrders(arr){
  localStorage.setItem(ORDERS_KEY, JSON.stringify(arr));
}
export function loadOrders(){
  try{ return JSON.parse(localStorage.getItem(ORDERS_KEY)) || []; }
  catch{ return []; }
}

export function saveAttendanceState(obj){
  localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(obj));
}
export function loadAttendanceState(){
  try{ return JSON.parse(localStorage.getItem(ATTENDANCE_KEY)) || {}; }
  catch{ return {}; }
}
