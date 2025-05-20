/* one place for the generic renderer */
export function renderTable({ containerId, headers, rows, options = {} }) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;
  const { sortState = null, onCheckbox = null } = options;

  let html = '<table><thead><tr>';
headers.forEach((h,i)=>{
  if (h === 'Name' || h === 'Role') {
    const arrow = sortState && sortState.key===i
      ? (sortState.asc?' ▲':' ▼') : ' ↕';
    html += `<th data-col="${i}" style="cursor:pointer;">${h}${arrow}</th>`;
  } else {
    html += `<th>${h}</th>`;
  }
});



  html += '</tr></thead><tbody>';

  rows.forEach((row,rIdx)=>{
    html += '<tr>';
    row.forEach((cell,cIdx)=>{
      if (typeof cell === 'boolean'){
        html += `<td><input type="checkbox" data-r="${rIdx}" data-c="${cIdx}"
                  ${cell?'checked':''}></td>`;
      } else {
        html += `<td title="${cell??''}">${cell??''}</td>`;
      }
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  wrap.innerHTML = html;

  if (onCheckbox){
    wrap.querySelectorAll('input[type="checkbox"]').forEach(cb=>{
      cb.onchange = ()=> onCheckbox(+cb.dataset.r, +cb.dataset.c, cb.checked);
    });
  }
}
