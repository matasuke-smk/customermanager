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
  console.log('renderCustomerList called');
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
  const cards = document.getElementById('customer-cards');
  if (cards) cards.innerHTML = '';
  sorted.forEach((c, i) => {
    // 最新のcustomersCacheからid一致のオブジェクトを取得
    const current = customersCache.find(cc => cc.id === c.id) || c;
    const isEditing = current._editing;
    let dueBg = '';
    const due = parseDate(current.dueDate);
    if (due) {
      const today = new Date();
      today.setHours(0,0,0,0);
      const diff = (due - today) / (1000 * 60 * 60 * 24);
      if (!isNaN(diff)) {
        if (diff < 7) dueBg = 'background:#ffcccc;';
        else if (diff < 14) dueBg = 'background:#ffe5b4;';
        else if (diff < 21) dueBg = 'background:#e5ffcc;';
        else dueBg = '';
      }
    }
    const card = document.createElement('div');
    card.className = 'customer-card';
    card.setAttribute('style', dueBg + 'flex:1 1 320px;min-width:280px;max-width:360px;box-sizing:border-box;');
    card.innerHTML = `
      <div style="margin-bottom:8px;">
        <span style="font-weight:bold;font-size:1.1em;">${current.name || ''}</span>
      </div>
      <div class="card-main">
        <div class="card-row"><span class="card-label">メール</span><span class="card-value">${isEditing ? `<input type="email" value="${current.email || ''}" data-id="${current.id}" data-field="email">` : (current.email ? `<a href="mailto:${current.email}">${current.email}</a>` : '')}</span></div>
        <div class="card-row"><span class="card-label">納期</span><span class="card-value">${isEditing ? `<input type="date" value="${current.dueDate ? current.dueDate.replace(/\//g, '-') : ''}" data-id="${current.id}" data-field="dueDate">` : (current.dueDate || '')}</span></div>
        <div class="card-row"><span class="card-label">金額</span><span class="card-value">${isEditing ? `<input type="number" value="${current.amount || ''}" data-id="${current.id}" data-field="amount" min="0">` : (current.amount ? current.amount + '円' : '')}</span></div>
        <div class="card-row"><span class="card-label">メモ</span><span class="card-value">${isEditing ? `<textarea data-id="${current.id}" data-field="memo">${current.memo || ''}</textarea>` : (current.memo || '')}</span></div>
        <div class="delivery-form-on-card">
          <label class="custom-file-label" style="position:relative;">
            <input type="file" name="deliveryFile" multiple style="opacity:0;position:absolute;left:0;top:0;width:100%;height:100%;cursor:pointer;z-index:2;">
            <span class="custom-file-text">ファイルを選択</span>
          </label>
          <span class="selected-file-name"></span>
        </div>
        <div class="delivery-form-on-card-btn-row">
          <button class="action-btn complete-btn" type="button">納品完了</button>
        </div>
      </div>
      <div class="card-actions-row card-actions">
        ${isEditing
          ? `<button class="action-btn save-btn">保存</button>`
          : `<button class="action-btn edit-btn">編集</button>`}
        <button class="action-btn delete-btn">削除</button>
      </div>
    `;
    cards.appendChild(card);
    // デバッグ: .edit-btnの数を出力
    console.log('edit-btn count:', cards.querySelectorAll('.edit-btn').length);
    // イベント付与
    const editBtn = card.querySelector('.edit-btn');
    console.log('editBtn:', editBtn ? editBtn.outerHTML : 'null', current.id);
    if (editBtn) {
      editBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        console.log('editBtn clicked', current.id);
        window.editRow(current.id);
      });
      console.log('editBtn event attached', current.id);
    }
    const saveBtn = card.querySelector('.save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        window.saveEdit(current.id);
      });
    }
    const deleteBtn = card.querySelector('.delete-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        window.deleteCustomerUI(current.id);
      });
    }
    const completeBtn = card.querySelector('.complete-btn');
    if (completeBtn) {
      completeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        window.completeDeliveryWithFile(current.id, card.querySelector('.delivery-form-on-card'));
      });
    }
    // ファイル選択ラベルのクリックでinputを開く、ファイル名表示
    const fileInput = card.querySelector('input[type="file"]');
    const fileNameSpan = card.querySelector('.selected-file-name');
    if (fileInput) {
      // 初期状態: ファイル未選択ならボタン無効化
      if (completeBtn) completeBtn.disabled = !fileInput.files.length;
      fileInput.addEventListener('change', function(e) {
        if (fileInput.files.length > 0) {
          fileNameSpan.textContent = Array.from(fileInput.files).map(f => f.name).join(', ');
          if (completeBtn) completeBtn.disabled = false;
        } else {
          fileNameSpan.textContent = '';
          if (completeBtn) completeBtn.disabled = true;
        }
      });
    }
    // 編集中でなければカードクリックで詳細画面
    if (!isEditing) {
      card.style.cursor = 'pointer';
      card.addEventListener('click', function(e) {
        if (e.target.closest('.action-btn')) return;
        if (
          e.target.closest('input[type="file"]') ||
          e.target.closest('input') ||
          e.target.closest('textarea')
        ) return;
        window.openCustomerDetail(current.id);
      });
    }
    // 編集中はカード外クリックで編集キャンセル
    if (isEditing) {
      setTimeout(() => {
        document.addEventListener('mousedown', cancelEditHandler);
      }, 0);
      function cancelEditHandler(e) {
        if (!card.contains(e.target)) {
          document.removeEventListener('mousedown', cancelEditHandler);
          // 編集中の顧客の_editingをfalseにして保存・再描画
          customersCache = getCustomers();
          const target = customersCache.find(c => c.id === current.id);
          if (target) target._editing = false;
          saveCustomers(customersCache);
          renderCustomerList();
        }
      }
    }
  });
  // 編集・保存イベント
  cards.querySelectorAll('input[data-id], textarea[data-id]').forEach(el => {
    el.addEventListener('change', function() {
      const id = this.dataset.id;
      const field = this.dataset.field;
      // 変換・クリアロジック削除
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
}

window.editRow = function(id) {
  console.log('editRow called', id);
  customersCache = getCustomers();
  customersCache.forEach((c) => { c._editing = false; });
  const target = customersCache.find(c => c.id === id);
  if (target) target._editing = true;
  saveCustomers(customersCache);
  renderCustomerList();
};

window.saveEdit = function(id) {
  console.log('saveEdit called', id);
  let found = false;
  // カード型
  const card = document.querySelector(`.customer-card input[data-id="${id}"]`)?.closest('.customer-card');
  if (card) {
    customersCache.forEach((c, i) => {
      if (c.id === id) {
        c.name = card.querySelector('input[data-field="name"]')?.value || c.name;
        c.email = card.querySelector('input[data-field="email"]')?.value || c.email;
        // 納期はYYYY-MM-DD→YYYY/MM/DDに変換して保存
        let dueDateVal = card.querySelector('input[data-field="dueDate"]')?.value || c.dueDate;
        if (dueDateVal && /^\d{4}-\d{2}-\d{2}$/.test(dueDateVal)) {
          dueDateVal = dueDateVal.replace(/-/g, '/');
        }
        c.dueDate = dueDateVal;
        c.amount = card.querySelector('input[data-field="amount"]')?.value || c.amount;
        c.memo = card.querySelector('textarea[data-field="memo"]')?.value || c.memo;
        c._editing = false;
        found = true;
      }
    });
  }
  if (found) {
    saveCustomers(customersCache);
    renderCustomerList();
    console.log('saveEdit: saved and re-rendered', id);
  } else {
    console.log('saveEdit: not found', id);
  }
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

// 顧客詳細モーダル制御・納品履歴管理
const detailModal = document.getElementById('customer-detail-modal');
const closeDetailModalBtn = document.getElementById('close-detail-modal');
const detailCustomerInfo = document.getElementById('detail-customer-info');
const deliveryList = document.getElementById('delivery-list');
const deliveryForm = document.getElementById('delivery-form');
let currentDetailCustomerId = null;

function openCustomerDetail(id) {
  const customers = getCustomers();
  const customer = customers.find(c => c.id === id);
  if (!customer) return;
  currentDetailCustomerId = id;
  // 顧客情報表示
  detailCustomerInfo.innerHTML = `
    <div><b>名前:</b> ${customer.name || ''}</div>
    <div><b>メール:</b> ${customer.email || ''}</div>
    <div><b>納期:</b> ${customer.dueDate || ''}</div>
    <div><b>金額:</b> ${customer.amount || ''}</div>
    <div><b>メモ:</b> ${customer.memo || ''}</div>
    <hr style="margin:16px 0 12px 0; border: none; border-top: 2px solid #ccc;">
    <h3 style='text-align:center;margin:0 0 12px 0;'>納品履歴</h3>
  `;
  // 納品履歴表示
  renderDeliveryList(customer);
  detailModal.style.display = 'flex';
}

function closeCustomerDetail() {
  detailModal.style.display = 'none';
  currentDetailCustomerId = null;
}

if (closeDetailModalBtn) {
  closeDetailModalBtn.onclick = closeCustomerDetail;
}

function renderDeliveryList(customer) {
  if (!customer.deliveries) customer.deliveries = [];
  if (!customer.deliveries.length) {
    deliveryList.innerHTML = '<div>納品履歴はありません</div>';
    return;
  }
  deliveryList.innerHTML = customer.deliveries.map((d, i) => {
    if (d._editing) {
      return `
        <div style="border-bottom:1px solid #eee;padding:8px 0;">
          <div><b>納品日:</b> <input type='date' value='${d.date || ''}' data-index='${i}' class='delivery-edit-date'></div>
          <div><b>金額:</b> <input type='text' value='${d.amount || ''}' data-index='${i}' class='delivery-edit-amount'></div>
          <div><b>メモ:</b> <input type='text' value='${d.memo || ''}' data-index='${i}' class='delivery-edit-memo'></div>
          <div><b>ファイル:</b> <span>（ファイル編集は不可）</span></div>
          <div class="delivery-actions-row" style="display:flex;gap:8px;margin-top:8px;">
            <button class='action-btn' onclick='saveDeliveryEdit(${i})'>保存</button>
            <button class='action-btn' onclick='cancelDeliveryEdit(${i})'>キャンセル</button>
          </div>
        </div>
      `;
    } else {
      return `
        <div style="border-bottom:1px solid #eee;padding:8px 0;">
          <div><b>納品日:</b> ${d.date || ''}</div>
          <div><b>金額:</b> ${d.amount ? d.amount + '円' : ''}</div>
          <div><b>メモ:</b> ${d.memo || ''}</div>
          <div style="display:flex;align-items:flex-start;"><span style="min-width:48px;display:inline-block;"><b>ファイル:</b></span><span>${d.files && d.files.length ? d.files.map(f => {
            if (f.url && f.url.startsWith('data:image/')) {
              return `<a href="${f.url}" download="${f.name}">${f.name}</a><br><img src="${f.url}" alt="${f.name}" style="max-width:120px;max-height:80px;display:block;margin:4px 0;">`;
            } else if (f.url && f.url.startsWith('data:application/pdf')) {
              return `<a href="${f.url}" download="${f.name}">${f.name}</a><br><embed src="${f.url}" type="application/pdf" width="120" height="80">`;
            } else {
              return `<a href="${f.url}" download="${f.name}">${f.name}</a>`;
            }
          }).join('<br>') : 'なし'}</span></div>
          <div class="delivery-actions-row" style="display:flex;gap:8px;margin-top:8px;">
            <button class='action-btn' onclick='editDelivery(${i})'>編集</button>
            <button class='action-btn' onclick='deleteDelivery(${i})'>削除</button>
          </div>
        </div>
      `;
    }
  }).join('');
}

window.editDelivery = function(index) {
  const customers = getCustomers();
  const customer = customers.find(c => c.id === currentDetailCustomerId);
  if (!customer) return;
  customer.deliveries.forEach((d, i) => { d._editing = (i === index); });
  saveCustomers(customers);
  renderDeliveryList(customer);
};

window.cancelDeliveryEdit = function(index) {
  const customers = getCustomers();
  const customer = customers.find(c => c.id === currentDetailCustomerId);
  if (!customer) return;
  customer.deliveries.forEach(d => { delete d._editing; });
  saveCustomers(customers);
  renderDeliveryList(customer);
};

window.saveDeliveryEdit = function(index) {
  const customers = getCustomers();
  const customer = customers.find(c => c.id === currentDetailCustomerId);
  if (!customer) return;
  const dateInput = document.querySelector('.delivery-edit-date[data-index="' + index + '"]');
  const amountInput = document.querySelector('.delivery-edit-amount[data-index="' + index + '"]');
  const memoInput = document.querySelector('.delivery-edit-memo[data-index="' + index + '"]');
  if (!dateInput || !memoInput || !amountInput) return;
  customer.deliveries[index].date = dateInput.value;
  customer.deliveries[index].amount = amountInput.value;
  customer.deliveries[index].memo = memoInput.value;
  delete customer.deliveries[index]._editing;
  saveCustomers(customers);
  renderDeliveryList(customer);
};

// カスタムconfirmモーダルのユーティリティ
function showCustomConfirm(message) {
  return new Promise((resolve) => {
    const modal = document.getElementById('custom-confirm-modal');
    const msg = document.getElementById('custom-confirm-message');
    const yesBtn = document.getElementById('custom-confirm-yes');
    const noBtn = document.getElementById('custom-confirm-no');
    msg.textContent = message;
    modal.style.display = 'flex';
    function cleanup(result) {
      modal.style.display = 'none';
      yesBtn.removeEventListener('click', onYes);
      noBtn.removeEventListener('click', onNo);
      resolve(result);
    }
    function onYes() { cleanup(true); }
    function onNo() { cleanup(false); }
    yesBtn.addEventListener('click', onYes);
    noBtn.addEventListener('click', onNo);
  });
}

// 納品履歴削除
window.deleteDelivery = async function(index) {
  const customers = getCustomers();
  const customer = customers.find(c => c.id === currentDetailCustomerId);
  if (!customer) return;
  const ok = await showCustomConfirm('この納品履歴を削除しますか？');
  if (!ok) return;
  customer.deliveries.splice(index, 1);
  saveCustomers(customers);
  renderDeliveryList(customer);
};

// 顧客リストに「納品完了」ボタン追加
window.completeDelivery = function(id) {
  const customers = getCustomers();
  const customer = customers.find(c => c.id === id);
  if (!customer) return;
  if (!customer.deliveries) customer.deliveries = [];
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = ('0' + (today.getMonth() + 1)).slice(-2);
  const dd = ('0' + today.getDate()).slice(-2);
  const dateStr = `${yyyy}/${mm}/${dd}`;
  // すでに同じ日付の納品履歴があれば追加しない
  if (customer.deliveries.some(d => d.date === dateStr)) return;
  customer.deliveries.push({ date: dateStr, memo: '', files: [], amount: customer.amount });
  saveCustomers(customers);
  if (currentDetailCustomerId === id) renderDeliveryList(customer);
  renderCustomerList();
};

// 新しいcompleteDeliveryWithFile関数を追加
window.completeDeliveryWithFile = async function(id, formEl) {
  customersCache = getCustomers();
  const customer = customersCache.find(c => c.id === id);
  if (!customer) return;
  if (!customer.deliveries) customer.deliveries = [];
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = ('0' + (today.getMonth() + 1)).slice(-2);
  const dd = ('0' + today.getDate()).slice(-2);
  const dateStr = `${yyyy}/${mm}/${dd}`;
  const filesInput = formEl.querySelector('input[type="file"]');
  const files = Array.from(filesInput.files);
  const fileObjs = await Promise.all(files.map(file => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = function(evt) {
      resolve({ name: file.name, url: evt.target.result });
    };
    reader.readAsDataURL(file);
  })));
  customer.deliveries.push({ date: dateStr, memo: '', files: fileObjs, amount: customer.amount });
  customer.dueDate = '';
  customer.amount = '';
  saveCustomers(customersCache);
  customersCache = getCustomers();
  renderCustomerList();
};

// モーダル外クリックで閉じる処理
if (detailModal) {
  detailModal.addEventListener('click', function(e) {
    if (e.target === detailModal) {
      // 納品履歴編集中ならキャンセル
      const editingInput = detailModal.querySelector('.delivery-edit-date');
      if (editingInput) {
        // 編集中のindexを取得
        const index = editingInput.getAttribute('data-index');
        if (typeof window.cancelDeliveryEdit === 'function') {
          window.cancelDeliveryEdit(index);
        }
      }
      closeCustomerDetail();
    }
  });
}

document.addEventListener('DOMContentLoaded', function() {
  document.body.addEventListener('focusin', function(e) {
    if (e.target.type === 'date' && typeof e.target.showPicker === 'function') {
      e.target.showPicker();
    }
  });
  document.body.addEventListener('click', function(e) {
    if (e.target.type === 'date' && typeof e.target.showPicker === 'function') {
      e.target.showPicker();
    }
  });
}); 