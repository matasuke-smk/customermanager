// 顧客データの取得・保存
function getCustomers() {
  return JSON.parse(localStorage.getItem('customers') || '[]');
}
function saveCustomers(customers) {
  localStorage.setItem('customers', JSON.stringify(customers));
}

// UI描画・操作
let customersCache = [];

function renderCustomerList() {
  customersCache = getCustomers();
  // 納期順に昇順ソートし、元データのインデックスも保持
  const customersWithIndex = customersCache.map((c, idx) => ({ ...c, _originalIndex: idx }));
  const sorted = customersWithIndex.slice().sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate.replace(/\//g, '-')) - new Date(b.dueDate.replace(/\//g, '-'));
  });
  const tbody = document.querySelector('#customer-table tbody');
  tbody.innerHTML = '';
  sorted.forEach((c, i) => {
    const isEditing = c._editing;
    // 納期の色分け
    let dueBg = '';
    if (c.dueDate) {
      const today = new Date();
      const due = new Date(c.dueDate.replace(/\//g, '-'));
      const diff = (due - today) / (1000 * 60 * 60 * 24);
      if (diff < 7) dueBg = 'background:#ffcccc;'; // 赤
      else if (diff < 14) dueBg = 'background:#ffe5b4;'; // オレンジ
      else if (diff < 21) dueBg = 'background:#e5ffcc;'; // 黄緑
    }
    const tr = document.createElement('tr');
    tr.setAttribute('style', dueBg);
    tr.innerHTML = `
      <td><input type=\"checkbox\" class=\"row-check\" data-original-index=\"${c._originalIndex}\"></td>
      <td>${isEditing ? `<input type=\"text\" value=\"${c.name || ''}\" data-original-index=\"${c._originalIndex}\" data-field=\"name\">` : (c.name || '')}</td>
      <td>${isEditing ? `<input type=\"email\" value=\"${c.email || ''}\" data-original-index=\"${c._originalIndex}\" data-field=\"email\">` : (c.email ? `<a href=\"mailto:${c.email}\">${c.email}</a>` : '')}</td>
      <td>${isEditing ? `<input type=\"text\" value=\"${c.dueDate || ''}\" data-original-index=\"${c._originalIndex}\" data-field=\"dueDate\" placeholder=\"yyyy/MM/dd\">` : (c.dueDate || '')}</td>
      <td>${isEditing ? `<input type=\"number\" value=\"${c.amount || ''}\" data-original-index=\"${c._originalIndex}\" data-field=\"amount\" min=\"0\">` : (c.amount ? c.amount + '円' : '')}</td>
      <td class=\"memo-cell\">${isEditing ? `<textarea data-original-index=\"${c._originalIndex}\" data-field=\"memo\">${c.memo || ''}</textarea>` : (c.memo || '')}</td>
      <td>
        ${isEditing ? `<button class=\"action-btn\" onclick=\"saveEdit(${c._originalIndex})\">保存</button>` : `<button class=\"action-btn\" onclick=\"editRow(${c._originalIndex})\">編集</button>`}
        <button class=\"action-btn\" onclick=\"deleteCustomerUI(${c._originalIndex})\">削除</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  // 編集時のイベント
  tbody.querySelectorAll('input[data-original-index], textarea[data-original-index]').forEach(el => {
    el.addEventListener('change', function() {
      const idx = Number(this.dataset.originalIndex);
      const field = this.dataset.field;
      let val = this.value;
      // 納期欄の8桁数字を自動変換し、年は4桁のみ許可
      if (field === 'dueDate' && /^\d{8}$/.test(val)) {
        val = val.replace(/(\d{4})(\d{2})(\d{2})/, '$1/$2/$3');
        this.value = val;
      }
      // 納期欄で4文字入力で/、さらに2文字入力で/を自動挿入
      if (field === 'dueDate') {
        if (/^\d{4}$/.test(val)) {
          this.value = val + '/';
        } else if (/^\d{4}\/\d{2}$/.test(val)) {
          this.value = val + '/';
        }
      }
      // 年は4桁のみ許可
      if (field === 'dueDate' && val && !/^\d{4}\//.test(val)) {
        this.value = '';
        val = '';
      }
      customersCache[idx][field] = this.value;
    });
    // エンターで保存
    if (el.tagName === 'INPUT') {
      el.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          const idx = Number(this.dataset.originalIndex);
          window.saveEdit(idx);
        }
      });
    }
  });
  // 一括選択チェックボックス
  document.getElementById('select-all').onclick = function() {
    const checked = this.checked;
    tbody.querySelectorAll('.row-check').forEach(cb => { cb.checked = checked; });
  };
}

window.editRow = function(index) {
  customersCache.forEach((c, i) => { c._editing = false; });
  if (typeof index === 'number' && customersCache[index]) {
    customersCache[index]._editing = true;
  }
  saveCustomers(customersCache);
  renderCustomerList();
};

window.saveEdit = function(index) {
  // 編集中のinput/textareaの値でcustomersCache[index]を更新
  const tr = document.querySelectorAll('#customer-table tbody tr');
  let row;
  for (let i = 0; i < tr.length; i++) {
    const checkbox = tr[i].querySelector('.row-check');
    if (checkbox && Number(checkbox.dataset.originalIndex) === index) {
      row = tr[i];
      break;
    }
  }
  if (row) {
    customersCache[index].name = row.querySelector('input[data-field="name"]').value;
    customersCache[index].email = row.querySelector('input[data-field="email"]').value;
    customersCache[index].dueDate = row.querySelector('input[data-field="dueDate"]').value;
    customersCache[index].amount = row.querySelector('input[data-field="amount"]').value;
    customersCache[index].memo = row.querySelector('textarea[data-field="memo"]').value;
  }
  customersCache[index]._editing = false;
  saveCustomers(customersCache);
  renderCustomerList();
};

window.deleteCustomerUI = function(index) {
  if (!confirm('本当に削除しますか？')) return;
  customersCache.splice(index, 1);
  saveCustomers(customersCache);
  renderCustomerList();
};

window.deleteSelected = function() {
  const tbody = document.querySelector('#customer-table tbody');
  const checks = tbody.querySelectorAll('.row-check');
  let toDelete = [];
  checks.forEach(cb => {
    const idx = Number(cb.dataset.originalIndex);
    if (cb.checked) toDelete.push(idx);
  });
  // 後ろから削除
  for (const idx of toDelete.sort((a, b) => b - a)) {
    customersCache.splice(idx, 1);
  }
  saveCustomers(customersCache);
  renderCustomerList();
};

// 上部入力フォームの納期欄の自動スラッシュ・自動変換
const dueDateInput = document.getElementById('dueDate');
if (dueDateInput) {
  dueDateInput.addEventListener('input', function() {
    // 全角文字を除去
    this.value = this.value.replace(/[^\x01-\x7E\uFF61-\uFF9F]/g, '');
    let val = this.value;
    // 8桁数字なら自動変換
    if (/^\d{8}$/.test(val)) {
      val = val.replace(/(\d{4})(\d{2})(\d{2})/, '$1/$2/$3');
      this.value = val;
    }
    // 4文字入力で/、さらに2文字入力で/を自動挿入
    if (/^\d{4}$/.test(val)) {
      this.value = val + '/';
    } else if (/^\d{4}\/\d{2}$/.test(val)) {
      this.value = val + '/';
    }
  });
}

// 入力フォームの全角・半角制御（名前・メモ欄の全角のみ制限を削除）
const nameInput = document.getElementById('name');
if (nameInput) {
  nameInput.removeEventListener && nameInput.removeEventListener('input', null);
}
const memoInput = document.getElementById('memo');
if (memoInput) {
  memoInput.removeEventListener && memoInput.removeEventListener('input', null);
}
const emailInput = document.getElementById('email');
if (emailInput) {
  emailInput.addEventListener('input', function() {
    // 全角文字を除去
    this.value = this.value.replace(/[^\x01-\x7E\uFF61-\uFF9F]/g, '');
  });
}
const amountInput = document.getElementById('amount');
if (amountInput) {
  amountInput.addEventListener('input', function() {
    // 全角文字を除去
    this.value = this.value.replace(/[^\x01-\x7E\uFF61-\uFF9F]/g, '');
  });
}

// 新規登録
const form = document.getElementById('customer-form');
form.addEventListener('submit', function(e) {
  e.preventDefault();
  const customer = {
    name: document.getElementById('name').value,
    email: document.getElementById('email').value,
    dueDate: document.getElementById('dueDate').value,
    amount: document.getElementById('amount').value,
    memo: document.getElementById('memo').value
  };
  customersCache.push(customer);
  saveCustomers(customersCache);
  renderCustomerList();
  form.reset();
});

document.getElementById('reset-btn').addEventListener('click', function() {
  form.reset();
});

// 初期表示
window.onload = renderCustomerList;

// ドロップダウン制御
window.toggleDropdown = function(event, i) {
  event.stopPropagation();
  // すべて閉じる
  document.querySelectorAll('.action-dropdown').forEach(el => el.classList.remove('show'));
  // 対象のみ開く
  const parent = event.target.closest('.action-dropdown');
  if (parent) parent.classList.toggle('show');
};
document.addEventListener('click', function() {
  document.querySelectorAll('.action-dropdown').forEach(el => el.classList.remove('show'));
});

// CSVエクスポート
window.exportCSV = function() {
  const customers = getCustomers();
  if (!customers.length) return alert('データがありません');
  const header = ['name','email','dueDate','amount','memo'];
  const csv = [header.join(',')].concat(
    customers.map(c => header.map(h => '"' + (c[h] ? String(c[h]).replace(/"/g, '""') : '') + '"').join(','))
  ).join('\r\n');
  // BOM付きUTF-8で出力
  const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
  const blob = new Blob([bom, csv], {type: 'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'customers.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// インポートボタンでファイル選択を開く
const importBtn = document.getElementById('import-csv-btn');
const importInput = document.getElementById('import-csv');
if (importBtn && importInput) {
  importBtn.addEventListener('click', function() {
    importInput.click();
  });
}
// CSVインポート
if (importInput) {
  importInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
      let text = evt.target.result;
      // BOM除去
      text = text.replace(/^\uFEFF/, '');
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (!lines.length) return alert('CSVが空です');
      const header = lines[0].split(',').map(h => h.replace(/(^\"|\"$)/g, ''));
      const fields = ['name','email','dueDate','amount','memo'];
      const data = lines.slice(1).map(line => {
        // カンマ区切り（空セルも含めて正確に分割）
        let cols = line.match(/(?:"([^"]*(?:""[^"]*)*)"|([^,]*))(,|$)/g);
        if (!cols) cols = [];
        cols = cols.map(s => s.replace(/,$/, ''));
        cols = cols.map(s => s.replace(/^"|"$/g, '').replace(/""/g, '"'));
        while (cols.length < header.length) cols.push('');
        let obj = {};
        fields.forEach((f) => {
          const idx = header.indexOf(f);
          obj[f] = idx >= 0 ? (cols[idx] || '') : '';
        });
        return obj;
      });
      // 既存データに上書き
      saveCustomers(data);
      renderCustomerList();
      alert('インポートが完了しました');
    };
    reader.readAsText(file);
    this.value = '';
  });
} 