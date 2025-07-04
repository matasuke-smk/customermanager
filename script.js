// 顧客データの取得・保存
function getCustomers() {
  return JSON.parse(localStorage.getItem('customers') || '[]');
}
function saveCustomers(customers) {
  localStorage.setItem('customers', JSON.stringify(customers));
}

// UI描画・操作
let customersCache = [];

// 日付パース関数（全ブラウザ・スマホ堅牢対応）
function parseDate(str) {
  if (!str) return null;
  // yyyy/MM/dd または yyyy-MM-dd
  let y, m, d;
  if (/^\d{4}[-\/]\d{2}[-\/]\d{2}$/.test(str)) {
    [y, m, d] = str.split(/[-\/]/).map(Number);
    if (y && m && d) return new Date(y, m - 1, d);
  }
  // 8桁数字（例: 20240601）も対応
  if (/^\d{8}$/.test(str)) {
    y = Number(str.slice(0,4));
    m = Number(str.slice(4,6));
    d = Number(str.slice(6,8));
    if (y && m && d) return new Date(y, m - 1, d);
  }
  // それ以外はDateコンストラクタに渡してみる
  const d2 = new Date(str);
  if (!isNaN(d2)) return d2;
  // ここでエラーを出す
  console.log('parseDate: 不正な日付形式', str);
  return null;
}

function renderCustomerList() {
  ensureCustomerIds();
  customersCache = getCustomers();
  // 納期順に昇順ソート
  const sorted = customersCache.slice().sort((a, b) => {
    const aDate = parseDate(a.dueDate);
    const bDate = parseDate(b.dueDate);
    if (!aDate && !bDate) return 0;
    if (!aDate) return 1;
    if (!bDate) return -1;
    return aDate - bDate;
  });
  const isMobile = window.innerWidth < 600;
  // テーブル型（PC）
  const table = document.getElementById('customer-table');
  const tbody = table.querySelector('tbody');
  // カード型（スマホ）
  const list = document.getElementById('customer-list');
  tbody.innerHTML = '';
  list.innerHTML = '';
  if (!isMobile) {
    // テーブル型
    sorted.forEach((c, i) => {
      const isEditing = c._editing;
      let dueBg = '';
      const due = parseDate(c.dueDate);
      if (due) {
        const today = new Date();
        today.setHours(0,0,0,0); // 時間を無視
        const diff = (due - today) / (1000 * 60 * 60 * 24);
        if (!isNaN(diff)) {
          if (diff < 7) dueBg = 'background:#ffcccc;';         // 1週間以内
          else if (diff < 14) dueBg = 'background:#ffe5b4;';   // 2週間以内
          else if (diff < 21) dueBg = 'background:#e5ffcc;';   // 3週間以内
          else dueBg = '';
        }
      }
      const tr = document.createElement('tr');
      tr.setAttribute('style', dueBg);
      tr.innerHTML = `
        <td><input type="checkbox" class="row-check" data-id="${c.id}"></td>
        <td>${isEditing ? `<input type="text" value="${c.name || ''}" data-id="${c.id}" data-field="name">` : (c.name || '')}</td>
        <td>${isEditing ? `<input type="email" value="${c.email || ''}" data-id="${c.id}" data-field="email">` : (c.email ? `<a href="mailto:${c.email}">${c.email}</a>` : '')}</td>
        <td>${isEditing ? `<input type="text" value="${c.dueDate || ''}" data-id="${c.id}" data-field="dueDate" placeholder="yyyy/MM/dd">` : (c.dueDate || '')}</td>
        <td>${isEditing ? `<input type="number" value="${c.amount || ''}" data-id="${c.id}" data-field="amount" min="0">` : (c.amount ? c.amount + '円' : '')}</td>
        <td>${isEditing ? `<textarea data-id="${c.id}" data-field="memo">${c.memo || ''}</textarea>` : (c.memo || '')}</td>
        <td>
          ${isEditing ? `<button class="action-btn" onclick="saveEdit('${c.id}')">保存</button>` : `<button class="action-btn" onclick="editRow('${c.id}')">編集</button>`}
          <button class="action-btn" onclick="deleteCustomerUI('${c.id}')">削除</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
    // 編集・保存イベント
    tbody.querySelectorAll('input[data-id], textarea[data-id]').forEach(el => {
      el.addEventListener('change', function() {
        const id = this.dataset.id;
        const field = this.dataset.field;
        let val = this.value;
        if (field === 'dueDate' && /^\d{8}$/.test(val)) {
          val = val.replace(/(\d{4})(\d{2})(\d{2})/, '$1/$2/$3');
          this.value = val;
        }
        if (field === 'dueDate') {
          if (/^\d{4}$/.test(val)) {
            this.value = val + '/';
          } else if (/^\d{4}\/\d{2}$/.test(val)) {
            this.value = val + '/';
          }
        }
        if (field === 'dueDate' && val && !/^\d{4}\//.test(val)) {
          this.value = '';
          val = '';
        }
        customersCache.forEach((c, i) => {
          if (c.id === id) {
            c[field] = this.value;
          }
        });
      });
      if (el.tagName === 'INPUT') {
        el.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            const id = this.dataset.id;
            window.saveEdit(id);
          }
        });
      }
    });
    // すべて選択チェックボックス
    const selectAll = document.getElementById('select-all');
    const allChecks = tbody.querySelectorAll('.row-check');
    if (selectAll) {
      selectAll.onclick = function() {
        const checked = this.checked;
        allChecks.forEach(cb => { cb.checked = checked; });
      };
    }
  } else {
    // カード型
    sorted.forEach((c, i) => {
      const isEditing = c._editing;
      let dueBg = '';
      const due = parseDate(c.dueDate);
      if (due) {
        const today = new Date();
        today.setHours(0,0,0,0); // 時間を無視
        const diff = (due - today) / (1000 * 60 * 60 * 24);
        if (!isNaN(diff)) {
          if (diff < 7) dueBg = 'background:#ffcccc;';         // 1週間以内
          else if (diff < 14) dueBg = 'background:#ffe5b4;';   // 2週間以内
          else if (diff < 21) dueBg = 'background:#e5ffcc;';   // 3週間以内
          else dueBg = '';
        }
      }
      const card = document.createElement('div');
      card.className = 'customer-card';
      card.setAttribute('style', dueBg);
      card.innerHTML = `
        <div class=\"card-row\">
          <!-- チェックボックスはスマホ表示では非表示 -->
          <span class=\"card-label\">名前</span>
          <span class=\"card-value\">${isEditing ? `<input type=\"text\" value=\"${c.name || ''}\" data-id=\"${c.id}\" data-field=\"name\">` : (c.name || '')}</span>
        </div>
        <div class=\"card-row\">
          <span class=\"card-label\">メール</span>
          <span class=\"card-value\">${isEditing ? `<input type=\"email\" value=\"${c.email || ''}\" data-id=\"${c.id}\" data-field=\"email\">` : (c.email ? `<a href=\"mailto:${c.email}\">${c.email}</a>` : '')}</span>
        </div>
        <div class=\"card-row\">
          <span class=\"card-label\">納期</span>
          <span class=\"card-value\">${isEditing ? `<input type=\"text\" value=\"${c.dueDate || ''}\" data-id=\"${c.id}\" data-field=\"dueDate\" placeholder=\"yyyy/MM/dd\">` : (c.dueDate || '')}</span>
        </div>
        <div class=\"card-row\">
          <span class=\"card-label\">金額</span>
          <span class=\"card-value\">${isEditing ? `<input type=\"number\" value=\"${c.amount || ''}\" data-id=\"${c.id}\" data-field=\"amount\" min=\"0\">` : (c.amount ? c.amount + '円' : '')}</span>
        </div>
        <div class=\"card-row\">
          <span class=\"card-label\">メモ</span>
          <span class=\"card-value\">${isEditing ? `<textarea data-id=\"${c.id}\" data-field=\"memo\">${c.memo || ''}</textarea>` : (c.memo || '')}</span>
        </div>
        <div class=\"card-actions\">
          ${isEditing ? `<button class=\"action-btn\" onclick=\"saveEdit('${c.id}')\">保存</button>` : `<button class=\"action-btn\" onclick=\"editRow('${c.id}')\">編集</button>`}
          <button class=\"action-btn\" onclick=\"deleteCustomerUI('${c.id}')\">削除</button>
        </div>
      `;
      list.appendChild(card);
    });
    // 編集・保存イベント
    list.querySelectorAll('input[data-id], textarea[data-id]').forEach(el => {
      el.addEventListener('change', function() {
        const id = this.dataset.id;
        const field = this.dataset.field;
        let val = this.value;
        if (field === 'dueDate' && /^\d{8}$/.test(val)) {
          val = val.replace(/(\d{4})(\d{2})(\d{2})/, '$1/$2/$3');
          this.value = val;
        }
        if (field === 'dueDate') {
          if (/^\d{4}$/.test(val)) {
            this.value = val + '/';
          } else if (/^\d{4}\/\d{2}$/.test(val)) {
            this.value = val + '/';
          }
        }
        if (field === 'dueDate' && val && !/^\d{4}\//.test(val)) {
          this.value = '';
          val = '';
        }
        customersCache.forEach((c, i) => {
          if (c.id === id) {
            c[field] = this.value;
          }
        });
      });
      if (el.tagName === 'INPUT') {
        el.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            const id = this.dataset.id;
            window.saveEdit(id);
          }
        });
      }
    });
    // すべて選択チェックボックス
    const selectAll = document.getElementById('select-all');
    const allChecks = list.querySelectorAll('.row-check');
    if (selectAll) {
      selectAll.onclick = function() {
        const checked = this.checked;
        allChecks.forEach(cb => { cb.checked = checked; });
      };
    }
  }
}

window.editRow = function(id) {
  customersCache.forEach((c, i) => { c._editing = false; });
  if (id && customersCache.find(c => c.id === id)) {
    customersCache.forEach((c, i) => {
      if (c.id === id) {
        c._editing = true;
      }
    });
  }
  saveCustomers(customersCache);
  renderCustomerList();
};

window.saveEdit = function(id) {
  // 編集中のinput/textareaの値でcustomersCacheを更新
  const tr = document.querySelectorAll('#customer-table tbody tr');
  let row;
  for (let i = 0; i < tr.length; i++) {
    const checkbox = tr[i].querySelector('.row-check');
    if (checkbox && checkbox.dataset.id === id) {
      row = tr[i];
      break;
    }
  }
  if (row) {
    customersCache.forEach((c, i) => {
      if (c.id === id) {
        c.name = row.querySelector('input[data-field="name"]').value;
        c.email = row.querySelector('input[data-field="email"]').value;
        c.dueDate = row.querySelector('input[data-field="dueDate"]').value;
        c.amount = row.querySelector('input[data-field="amount"]').value;
        c.memo = row.querySelector('textarea[data-field="memo"]').value;
      }
    });
  }
  customersCache.forEach((c, i) => {
    if (c.id === id) {
      c._editing = false;
    }
  });
  saveCustomers(customersCache);
  renderCustomerList();
};

window.deleteCustomerUI = function(id) {
  if (!confirm('本当に削除しますか？')) return;
  customersCache = getCustomers();
  const idx = customersCache.findIndex(c => c.id === id);
  if (idx !== -1) {
    customersCache.splice(idx, 1);
    saveCustomers(customersCache);
    renderCustomerList();
  }
};

window.deleteSelected = function() {
  const tableChecks = document.querySelectorAll('#customer-table tbody .row-check');
  const cardChecks = document.querySelectorAll('#customer-list .row-check');
  const checks = Array.from(tableChecks).concat(Array.from(cardChecks));
  let toDelete = [];
  checks.forEach(cb => {
    const id = cb.dataset.id;
    if (cb.checked && id) toDelete.push(id);
  });
  if (toDelete.length === 0) {
    alert('削除する顧客を選択してください');
    return;
  }
  if (!confirm('選択した顧客を本当に削除しますか？')) return;
  customersCache = getCustomers();
  toDelete.forEach(id => {
    const idx = customersCache.findIndex(c => c.id === id);
    if (idx !== -1) customersCache.splice(idx, 1);
  });
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
  customersCache = getCustomers();
  const customer = {
    id: Date.now().toString() + Math.random().toString(36).slice(2), // ユニークID
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

// 既存データにidを後付け
function ensureCustomerIds() {
  let changed = false;
  customersCache = getCustomers();
  customersCache.forEach(c => {
    if (!c.id) {
      c.id = Date.now().toString() + Math.random().toString(36).slice(2);
      changed = true;
    }
  });
  if (changed) saveCustomers(customersCache);
} 