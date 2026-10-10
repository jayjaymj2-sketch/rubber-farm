'use strict';
/* v3.5: durable saves, acknowledged sync, portable backups and daily accounting. */
const ACCOUNT_COLLS = ['sales', 'worklogs', 'payments', 'expenses', 'incomes', 'tapping'];
// Form drafts are mutable; memoizing by object identity can show an outdated amount.
saleCalc = _saleCalcRaw;
SCHEMA.closings = { title: 'ปิดยอดรายเดือน', icon: 'shieldck', fields: [
  { k: 'date', l: 'วันที่', t: 'date' }, { k: 'month', l: 'เดือน', t: 'text' },
  { k: 'farmId', l: 'สวน', t: 'ref', coll: 'farms', label: f => f.name },
  { k: 'status', l: 'สถานะ', t: 'text' }, { k: 'summary', l: 'สรุปยอด', t: 'obj' },
  { k: 'audit', l: 'ประวัติ', t: 'obj' }, { k: 'closedAt', l: 'ปิดยอดเมื่อ', t: 'num' },
  { k: 'versions', l: 'ข้อมูลที่ตรวจยอดแล้ว', t: 'obj' },
  { k: 'reason', l: 'เหตุผล', t: 'area' }
] };

const clone35 = v => JSON.parse(JSON.stringify(v));
let dataQueue35 = Promise.resolve();
function dataLock35(fn) {
  const task = dataQueue35.then(fn); dataQueue35 = task.catch(() => {}); return task;
}
function strictLocalFlush35() {
  const j = { __meta: META }; COLLS.forEach(c => j[c] = [...DB[c].values()]);
  localStorage.setItem('rubberfarm', JSON.stringify(j));
}
store.lsFlush = strictLocalFlush35;
store.putMeta = function () { return dataLock35(async () => {
  if (store.mode === 'ls') { strictLocalFlush35(); return; }
  // Errors must reach the caller; a failed metadata write is not a successful save.
  return new Promise((res, rej) => {
    const tx = store.db.transaction('meta', 'readwrite');
    tx.objectStore('meta').put(clone35(META), 'meta');
    tx.oncomplete = () => res(); tx.onerror = tx.onabort = () => rej(tx.error || new Error('บันทึกไม่สำเร็จ'));
  });
}); };
store.photo = function (op, key, val) {
  if (this.mode === 'ls') {
    try {
      const k = 'rf_photo_' + key;
      if (op === 'get') return Promise.resolve(localStorage.getItem(k) || memPhotos.get(key));
      if (op === 'put') localStorage.setItem(k, val); else localStorage.removeItem(k);
      return Promise.resolve();
    } catch (e) { return Promise.reject(new Error('พื้นที่เก็บรูปไม่เพียงพอ กรุณาสำรองข้อมูลก่อน')); }
  }
  return new Promise((res, rej) => {
    const tx = this.db.transaction('photos', op === 'get' ? 'readonly' : 'readwrite'); const os = tx.objectStore('photos');
    let result;
    if (op === 'get') { const q = os.get(key); q.onsuccess = () => { result = q.result; }; }
    else if (op === 'put') os.put(val, key); else os.delete(key);
    tx.oncomplete = () => res(result); tx.onerror = tx.onabort = () => rej(tx.error || new Error('เก็บรูปไม่สำเร็จ'));
  });
};
async function commit35(updates, nextMeta, photos = {}) {
  if (store.mode === 'ls') {
    // Commit records and pending queue together, before changing the in-memory database.
    for (const [ref, value] of Object.entries(photos)) await store.photo('put', ref, value);
    const j = { __meta: nextMeta };
    COLLS.forEach(c => { const m = new Map(DB[c]); (updates[c] || []).forEach(r => m.set(r.id, r)); j[c] = [...m.values()]; });
    localStorage.setItem('rubberfarm', JSON.stringify(j));
  } else {
    await new Promise((res, rej) => {
      const tx = store.db.transaction(['rec', 'meta', 'photos'], 'readwrite');
      for (const [c, rows] of Object.entries(updates)) rows.forEach(r => tx.objectStore('rec').put(r, c + '|' + r.id));
      for (const [ref, value] of Object.entries(photos)) tx.objectStore('photos').put(value, ref);
      tx.objectStore('meta').put(clone35(nextMeta), 'meta');
      tx.oncomplete = () => res(); tx.onerror = tx.onabort = () => rej(tx.error || new Error('พื้นที่เก็บข้อมูลเต็มหรือบันทึกไม่สำเร็จ'));
    });
  }
  for (const [c, rows] of Object.entries(updates)) rows.forEach(r => DB[c].set(r.id, r));
  META = nextMeta; bumpData(); updateSyncBtn();
}
function closingId35(farm, month) { return 'close:' + farm + ':' + month; }
function periods35(r) {
  if (!r) return [];
  return [...new Set([r.date, r.received && r.receivedDate, r.paid !== false && r.paidDate].filter(Boolean).map(d => String(d).slice(0, 7)))];
}
function touchedClosings35(coll, rec, before) {
  if (coll === 'plots' && before && rec.farmId !== before.farmId) {
    return ACCOUNT_COLLS.flatMap(c => list(c, r => r.plotId === before.id).flatMap(r => touchedClosings35(c, { ...r, farmId: rec.farmId }, r)));
  }
  if (!ACCOUNT_COLLS.includes(coll)) return [];
  const found = new Map();
  [before, rec].filter(Boolean).forEach(r => periods35(r).forEach(m => {
    const farm = farmOf(r);
    // Unassigned legacy entries affect every farm; protect them too.
    list('closings', x => x.month === m && (!farm || x.farmId === farm)).forEach(x => found.set(x.id, x));
  }));
  return [...found.values()];
}
function saleError35(d) {
  if (!(num(d.weight) > 0) || !(num(d.price) > 0)) return 'น้ำหนักและราคาต้องมากกว่า 0';
  if (shareProduct(d) && d.priceBasis === 'dry' && !(num(d.drc) > 0 && num(d.drc) <= 100)) return 'กรุณาใส่ %DRC มากกว่า 0 และไม่เกิน 100';
  if (d.drc !== '' && d.drc != null && (num(d.drc) < 0 || num(d.drc) > 100)) return '%DRC ต้องอยู่ระหว่าง 0–100';
  if (d.split === 'share' && (!Array.isArray(d.workerIds) || !d.workerIds.length)) return 'เลือกคนกรีดที่ได้รับส่วนแบ่ง';
  if (d.split === 'share' && (num(d.ownerPct) < 0 || num(d.ownerPct) > 100)) return 'สัดส่วนเจ้าของต้องอยู่ระหว่าง 0–100';
  if (num(d.deduct) < 0 || num(d.sharedCost) < 0 || saleCalc(d).base < 0) return 'ค่าหักต้องไม่ติดลบหรือมากกว่ายอดขาย';
  if (d.split === 'share' && d.shareMode === 'custom' && d.workerIds.length > 1) {
    if (d.workerIds.some(id => num(d.shares?.[id]) < 0) || Math.abs(sum(d.workerIds, id => num(d.shares?.[id])) - 100) > .01) return 'สัดส่วนคนกรีดต้องรวมเป็น 100%';
  }
  return '';
}
const originalSaleValidation35 = SCHEMA.sales.validate;
SCHEMA.sales.validate = d => saleError35(d) || originalSaleValidation35(d);
function reasonSheet35(title, message) {
  return new Promise(res => {
    const ov = openSheet({ title, body: `<p class="small">${esc(message)}</p><div class="field"><label class="fl" for="reason35">เหตุผล *</label><textarea class="inp" id="reason35" rows="3" maxlength="500"></textarea></div>`,
      foot: '<button class="btn" data-cancel>ยกเลิก</button><button class="btn pri" data-ok>ยืนยัน</button>', onClose: () => res('') });
    $('[data-cancel]', ov).onclick = () => { closeSheet(ov, true); res(''); };
    $('[data-ok]', ov).onclick = () => { const v = $('#reason35', ov).value.trim(); if (!v) return toast('กรุณาระบุเหตุผล', 'warn'); closeSheet(ov, true); res(v); };
  });
}
saveRec = async function (coll, input, opts = {}) {
  if (!canEdit()) throw new Error('บัญชีนี้ดูข้อมูลได้อย่างเดียว');
  let reason = '';
  const existing = input.id && DB[coll]?.get(input.id);
  const periods = touchedClosings35(coll, input, existing);
  if (!opts.photoOnly && periods.some(x => x.status === 'closed')) {
    toast('เดือนนี้ปิดยอดแล้ว ให้เจ้าของเปิดงวดพร้อมระบุเหตุผลก่อนแก้ไข', 'warn'); throw new Error('closed-period');
  }
  if (!opts.photoOnly && periods.some(x => x.closedAt)) {
    reason = await reasonSheet35('แก้ข้อมูลหลังปิดยอด', 'บันทึกเหตุผลไว้กับรายการและประวัติการแก้ไข');
    if (!reason) throw new Error('cancelled');
  }
  return dataLock35(async () => {
    const before = input.id && DB[coll].get(input.id);
    if (before && num(input.updatedAt) !== num(before.updatedAt) && !opts.resolveConflict && !opts.photoOnly) {
      toast('รายการนี้เปลี่ยนระหว่างกรอก กรุณาเปิดใหม่เพื่อตรวจข้อมูลล่าสุด', 'warn'); throw new Error('stale-form');
    }
    if (!opts.photoOnly && touchedClosings35(coll, input, before).some(x => x.status === 'closed')) throw new Error('เดือนนี้ปิดยอดแล้ว');
    if (coll === 'closings' && role() !== 'owner') throw new Error('เจ้าของเท่านั้นที่ปิดหรือเปิดงวดได้');
    if (coll === 'closings' && (!input.farmId || !/^\d{4}-(0[1-9]|1[0-2])$/.test(input.month || '') || !String(input.reason || '').trim() || input.deleted)) throw new Error('ข้อมูลปิดยอดหรือเหตุผลไม่ถูกต้อง');
    const r = clone35(input); if (!r.id) { r.id = uid(); r.createdAt = Date.now(); }
    r.deleted = r.deleted ? 1 : 0;
    if (!r.deleted && coll === 'sales') { const error = SCHEMA.sales.validate(r); if (error) { toast(error, 'warn'); throw new Error(error); } }
    if (opts.photoOnly) { Object.assign(r, before, { photos: r.photos }); }
    if (typeof validate36 === 'function') validate36(coll, r, before);
    r.updatedAt = Math.max(Date.now(), num(before?.updatedAt) + 1);
    r._rev = opts.resolveConflict ? num(input._rev) : num(before ? before._rev : input._rev);
    r._mutationId = uid(); if (reason) r.editReason = reason;
    const meta = clone35(META); meta.dirty ||= {}; const ids = meta.dirty[coll] ||= []; if (!ids.includes(r.id)) ids.push(r.id);
    if (opts.resolveConflict && meta.conflicts) delete meta.conflicts[coll + '|' + r.id];
    try { await commit35({ [coll]: [r] }, meta); }
    catch (e) { toast('บันทึกไม่สำเร็จ: ' + e.message, 'err'); throw e; }
    if (!opts.noHist && !r.demo && SCHEMA[coll]) {
      const action = !before ? 'create' : r.deleted && !before.deleted ? 'delete' : !r.deleted && before.deleted ? 'restore' : 'edit';
      await histPut({ coll, recId: r.id, at: Date.now(), action, label: recLabel(coll, r), reason: reason || r.editReason || (coll === 'closings' ? r.reason : ''), before: before ? clone35(before) : null });
      histTrim();
    }
    scheduleSync(); return r;
  });
};

api = async function (action, payload = {}, connection = S()) {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 60000);
  try {
    const s = connection; if (!s.scriptUrl || !s.apiKey) throw new Error('แตะลิงก์เปิดสวนของครอบครัวครั้งแรกก่อน');
    if (!navigator.onLine) throw new Error('ออฟไลน์อยู่');
    const resp = await fetch(s.scriptUrl, { method: 'POST', body: JSON.stringify({ action, key: s.apiKey, ...payload }), signal: controller.signal });
    let data; try { data = JSON.parse(await resp.text()); } catch (e) { throw new Error('เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง กรุณาตรวจสอบการเชื่อมต่อ'); }
    if (!data.ok) throw new Error(data.error || 'ไม่สำเร็จ'); return data;
  } catch (e) { if (e.name === 'AbortError') throw new Error('หมดเวลารอเซิร์ฟเวอร์ ข้อมูลยังอยู่ในเครื่อง กดซิงค์อีกครั้งได้'); throw e; }
  finally { clearTimeout(timer); }
};
function pendingSend35() {
  const changes = {}; let count = 0, bytes = 0, full = false;
  for (const c of COLLS) for (const id of META.dirty?.[c] || []) {
    const r = DB[c].get(id); if (!r || hasLocalPhotos(r) || META.conflicts?.[c + '|' + id]) continue;
    const copy = clone35(r); copy._mutationId ||= uid(); copy._baseRevision = num(r._rev);
    const sz = JSON.stringify(copy).length;
    if (count && (count >= 200 || bytes + sz > 700000)) { full = true; return { changes, full }; }
    (changes[c] ||= []).push(copy); count++; bytes += sz;
  }
  return { changes, full };
}
async function applySync35(data, sent) {
  if (data.syncProtocol !== 2 || !data.accepted || !data.conflicts) throw new Error('ต้องอัปเดต Code.gs เป็น v3.5 แล้ว Deploy ใหม่ ข้อมูลรอส่งยังเก็บไว้ครบ');
  return dataLock35(async () => {
    const meta = clone35(META); meta.dirty ||= {}; meta.conflicts ||= {};
    meta.auth = { user: data.user, role: data.role, permissions: data.permissions || {}, at: Date.now() }; const updates = {};
    const put = (c, r) => { const rows = updates[c] ||= []; const i = rows.findIndex(x => x.id === r.id); if (i < 0) rows.push(r); else rows[i] = r; };
    const current = (c, id) => updates[c]?.find(x => x.id === id) || DB[c].get(id);
    const clean = (c, id) => { meta.dirty[c] = (meta.dirty[c] || []).filter(x => x !== id); if (!meta.dirty[c].length) delete meta.dirty[c]; delete meta.conflicts[c + '|' + id]; };
    for (const c of COLLS) {
      if (data.scopeReset) {
        const scopeState = typeof state36 === 'function' ? state36() : {};
        const user = { role: data.role, ...(data.permissions || {}) };
        for (const loc of DB[c].values()) {
          if (typeof Farm36 !== 'undefined' && !Farm36.access(scopeState, user, c, loc)) {
            // Remove the business data, including locally cached before-images, when scope is narrowed.
            put(c, { id: loc.id, deleted: 1, updatedAt: 0, _rev: -1 }); clean(c, loc.id);
          }
        }
      }
      for (const ack of data.accepted[c] || []) {
        const request = sent[c]?.find(x => x.id === ack.id && x._mutationId === ack.mutationId);
        const loc = current(c, ack.id); if (!request || !loc) continue;
        const same = loc._mutationId === ack.mutationId || (!loc._mutationId && loc.updatedAt === request.updatedAt);
        if (same) { put(c, coerce(c, ack.record)); clean(c, ack.id); }
        else put(c, { ...loc, _rev: num(ack.record._rev) });
      }
      for (const conflict of [...(data.conflicts[c] || []), ...(data.rejected?.[c] || [])]) {
        const loc = current(c, conflict.id); if (!loc) continue;
        if (data.scopeReset && loc.deleted && num(loc._rev) === -1) continue;
        meta.conflicts[c + '|' + conflict.id] = { coll: c, id: conflict.id, server: conflict.server ? coerce(c, conflict.server) : null, reason: conflict.reason || 'ข้อมูลสองเครื่องไม่ตรงกัน', at: Date.now() };
      }
      for (const raw of data.changes?.[c] || []) {
        if (!raw?.id) continue; const remote = coerce(c, raw), loc = current(c, remote.id);
        if ((meta.dirty[c] || []).includes(remote.id)) {
          if (loc && num(remote._rev) !== num(loc._rev) && !meta.conflicts[c + '|' + remote.id]) {
            meta.conflicts[c + '|' + remote.id] = { coll: c, id: remote.id, server: remote, reason: 'มีการแก้ไขรายการนี้จากอีกเครื่อง', at: Date.now() };
          }
          continue;
        }
        if (!loc || num(remote._rev) > num(loc._rev) || (num(remote._rev) === num(loc._rev) && num(remote.updatedAt) >= num(loc.updatedAt))) put(c, remote);
      }
    }
    meta.lastPull = data.serverTime; meta.lastSyncAt = Date.now(); meta.syncProtocol = 2;
    if (data.scopeReset && typeof clearScopedHistory36 === 'function') {
      const scope = JSON.stringify({ role: data.role, permissions: data.permissions || {} });
      if (scope !== META.scopeFingerprint) await clearScopedHistory36(); meta.scopeFingerprint = scope;
    }
    await commit35(updates, meta); return updates;
  });
}
let syncJob35 = null;
async function syncRun35(manual) {
  const s = S(); if (!s.scriptUrl || !s.apiKey) { if (manual) { toast('แตะลิงก์เปิดสวนของครอบครัวครั้งแรกก่อน', 'warn'); go('connection37'); } return; }
  if (syncing) return;
  if (!navigator.onLine) { if (manual) toast('เก็บข้อมูลในเครื่องแล้ว จะส่งเมื่อออนไลน์', 'warn'); updateSyncBtn(); return; }
  syncing = true; syncErr = ''; updateSyncBtn();
  try {
    const info = await api('ping');
    if (info.syncProtocol !== 2) throw new Error('ต้องอัปเดต Code.gs เป็น v3.5 แล้ว Deploy ใหม่ ข้อมูลรอส่งยังเก็บไว้ครบ');
    if (typeof Farm36 !== 'undefined' && info.ownerAccounting !== 1) throw new Error('อัปเดต Code.gs เป็น v3.6 แล้ว Deploy ก่อน ข้อมูลในเครื่องยังเก็บไว้');
    await dataLock35(async () => {
      const updates = {};
      for (const c of COLLS) for (const id of META.dirty?.[c] || []) {
        const r = DB[c].get(id); if (r && !r._mutationId) (updates[c] ||= []).push({ ...r, _mutationId: uid() });
      }
      if (Object.keys(updates).length) await commit35(updates, clone35(META));
    });
    if (canEdit()) await uploadPendingPhotos();
    for (let round = 0; round < 60; round++) {
      const { changes, full } = pendingSend35();
      const data = await api('sync', { since: META.lastPull || 0, changes, client: APP_VERSION, protocol: 2, ownerAccounting: 1 });
      await applySync35(data, changes);
      if (!full) break;
    }
    if (photoErr) syncErr = photoErr;
    const conflicts = Object.keys(META.conflicts || {}).length;
    if (manual) toast(conflicts ? `มี ${conflicts} รายการต้องตรวจ ไปที่ “ตรวจรายการซิงค์”` : syncErr || (dirtyCount() ? `ยังรอส่ง ${dirtyCount()} รายการ` : 'ส่งข้อมูลและรับคำยืนยันครบแล้ว'), conflicts || syncErr || dirtyCount() ? 'warn' : 'ok');
    if (!$('.overlay')) render();
  } catch (e) { syncErr = e.message; if (manual) toast('ซิงค์ไม่สำเร็จ: ' + e.message, 'err'); }
  finally { syncing = false; updateSyncBtn(); if (route.name === 'home' && !list('farms').length) render(); if (dirtyCount() && !syncErr && !Object.keys(META.conflicts || {}).length && S().autoSync) scheduleSync(); }
}
sync = function(manual) {
  if (syncJob35) return syncJob35;
  syncJob35 = syncRun35(manual).finally(() => { syncJob35 = null; });
  return syncJob35;
};
const syncBtnRaw35 = updateSyncBtn;
updateSyncBtn = function () {
  syncBtnRaw35(); const b = $('#syncBtn'); if (!b) return;
  b.setAttribute('aria-label', !S().scriptUrl ? 'ยังไม่เชื่อม Google Sheets เก็บข้อมูลในเครื่อง' : syncing ? 'กำลังส่งข้อมูล' : syncErr ? 'ส่งข้อมูลไม่สำเร็จ' : dirtyCount() ? `รอส่ง ${dirtyCount()} รายการ` : META.lastSyncAt ? 'ข้อมูลส่งครบแล้ว' : 'ยังไม่ได้ซิงค์');
  const box = $('#dataStatus35'); if (box) box.innerHTML = dataStatusHtml35();
};
async function useServer35(conflict) {
  await dataLock35(async () => {
    const meta = clone35(META); const { coll, id, server } = conflict;
    if (!server) throw new Error('ไม่มีฉบับเซิร์ฟเวอร์ให้เลือก');
    meta.dirty[coll] = (meta.dirty[coll] || []).filter(x => x !== id); if (!meta.dirty[coll].length) delete meta.dirty[coll];
    delete meta.conflicts[coll + '|' + id];
  const before = DB[coll].get(id);
    await commit35({ [coll]: [server] }, meta);
    await histPut({ coll, recId: id, at: Date.now(), action: 'edit', label: 'เลือกฉบับเซิร์ฟเวอร์: ' + recLabel(coll, server), before });
  });
}
function conflictValue35(f, r) {
  if (!r) return 'ยังไม่มีรายการ'; const v = r[f.k]; if (v === undefined || v === null || v === '') return '—';
  if (f.t === 'date') return thDate(v);
  if (f.t === 'num') return fmt(v);
  if (f.t === 'chk') return v ? 'ใช่' : 'ไม่ใช่';
  if (f.t === 'ref') return DB[f.coll]?.get(v)?.name || v;
  if (f.t === 'mref') return (v || []).map(id => DB[f.coll]?.get(id)?.name || id).join(', ');
  if (f.t === 'sel' || f.t === 'seg') return fieldOpts(f, r).find(([id]) => id === v)?.[1] || v;
  if (f.t === 'photos') return (v || []).length + ' รูป';
  if (f.t === 'shares') return Object.entries(v).map(([id, amount]) => workerName(id) + ' ' + fmt(amount) + '%').join(', ');
  if (f.t === 'obj') return f.k === 'summary' ? Object.entries(v).map(([k, amount]) => (['profit','cashIn','cashOut','sales'].includes(k) ? ({ profit:'กำไร',cashIn:'รับจริง',cashOut:'จ่ายจริง',sales:'ยอดขาย' })[k] + ' ' + baht(amount) : '')).filter(Boolean).join(' · ') : 'ข้อมูลประกอบ';
  return String(v);
}
function conflictTable35(cf) {
  const local = DB[cf.coll].get(cf.id); const remote = cf.server;
  const fields = (SCHEMA[cf.coll]?.fields || []).filter(f => f.l && !['photo','gps'].includes(f.t) && (local?.[f.k] !== undefined || remote?.[f.k] !== undefined));
  return `<div class="tbl-wrap"><table class="tbl compare35"><thead><tr><th>รายละเอียด</th><th>ในเครื่อง</th><th>บนเซิร์ฟเวอร์</th></tr></thead><tbody><tr><td>สถานะรายการ</td><td>${local?.deleted ? 'ลบแล้ว' : 'ใช้งาน'}</td><td>${!remote ? 'ยังไม่มี' : remote.deleted ? 'ลบแล้ว' : 'ใช้งาน'}</td></tr>${fields.map(f => `<tr><td>${esc(f.l)}</td><td>${esc(conflictValue35(f, local))}</td><td>${esc(conflictValue35(f, remote))}</td></tr>`).join('')}</tbody></table></div>`;
}
ROUTES.conflicts = { title: 'ตรวจรายการซิงค์', render(main) {
  const entries = Object.entries(META.conflicts || {});
  main.innerHTML = `<div class="card"><h3>${ic('sync')} รายการที่ต้องตรวจ</h3><p class="small">ข้อมูลในเครื่องยังเก็บไว้ เลือกฉบับที่ถูกต้องก่อนส่งต่อ</p><button class="btn" id="retry35">ซิงค์อีกครั้ง</button></div>` +
    (entries.length ? entries.map(([key, cf], i) => `<div class="card"><h3>${esc(recLabel(cf.coll, DB[cf.coll].get(cf.id) || {}))}</h3><p class="warn small">${esc(cf.reason)}</p>${conflictTable35(cf)}<div class="row wrap">${cf.server ? `<button class="btn" data-server="${i}">ใช้ฉบับเซิร์ฟเวอร์</button>` : ''}${canEdit() ? `<button class="btn pri" data-local="${i}">ใช้ฉบับในเครื่อง</button><button class="btn" data-edit="${i}">แก้รายละเอียด</button>` : ''}</div></div>`).join('') : emptyBox('ไม่มีรายการขัดแย้ง', 'check'));
  $('#retry35', main).onclick = () => sync(true);
  $$('[data-server]', main).forEach(b => b.onclick = async () => { try { const cf = entries[num(b.dataset.server)][1]; if (await confirmBox('ใช้ฉบับเซิร์ฟเวอร์แทนฉบับในเครื่อง? ฉบับเดิมจะเก็บในประวัติ', 'ใช้ฉบับนี้', false)) { await useServer35(cf); render(); scheduleSync(); } } catch (e) { toast(e.message, 'err'); } });
  $$('[data-local]', main).forEach(b => b.onclick = async () => {
    const cf = entries[num(b.dataset.local)][1]; const reason = await reasonSheet35('ยืนยันฉบับในเครื่อง', 'ระบุเหตุผลที่เลือกฉบับนี้ ระบบจะตรวจอีกครั้งก่อนเขียนทับ'); if (!reason) return;
    try { await saveRec(cf.coll, { ...DB[cf.coll].get(cf.id), _rev: num(cf.server?._rev), editReason: reason }, { resolveConflict: true }); render(); await sync(true); } catch (e) { toast(e.message, 'warn'); }
  });
  $$('[data-edit]', main).forEach(b => b.onclick = () => { const cf = entries[num(b.dataset.edit)][1]; openForm(cf.coll, DB[cf.coll].get(cf.id)); });
} };

function photoRefs35(j) {
  const refs = new Set(); for (const rows of Object.values(j.data)) for (const r of rows) {
    for (const ref of [...(Array.isArray(r.photos) ? r.photos : []), r.photo].filter(Boolean)) if (!String(ref).startsWith('data:')) refs.add(ref);
  } return [...refs];
}
async function buildBackup35(includeRemote = true) {
  const j = clone35(snapshotData()); j.format = 2; j.photos = {}; j.missingPhotos = [];
  const refs = photoRefs35(j);
  for (const ref of refs) {
    let src = await store.photo('get', ref);
    if (!src && includeRemote && String(ref).startsWith('d:')) src = await photoSrc(ref);
    if (src) j.photos[ref] = src; else j.missingPhotos.push(ref);
  }
  j.photoComplete = j.missingPhotos.length === 0; j.includesRemotePhotos = includeRemote;
  // Preferences travel with the backup; credentials deliberately remain device-specific.
  const { scriptUrl, apiKey, ...settings } = S(); j.settings = settings;
  j.conflicts = clone35(META.conflicts || {});
  return j;
}
async function exportBackup35(button) {
  const label = button?.textContent; if (button) { button.disabled = true; button.textContent = 'กำลังรวบรวมข้อมูลและรูป...'; }
  try {
    const remote = $('#backupRemote35')?.checked !== false; const j = await buildBackup35(remote);
    if (j.missingPhotos.length && !(await confirmBox(`มีรูป ${j.missingPhotos.length} รูปที่รวมในไฟล์ไม่ได้ ไฟล์นี้จะมีข้อมูลและรูปเท่าที่พบ ต้องการดาวน์โหลดหรือไม่?`, 'ดาวน์โหลดเท่าที่มี', false))) return;
    downloadFile(`สวนยาง_สำรอง_${today()}.json`, JSON.stringify(j), 'application/json');
    await dataLock35(async () => { const meta = clone35(META); meta.lastBackupAt = Date.now(); meta.lastBackupComplete = j.photoComplete; meta.lastBackupPhotos = Object.keys(j.photos).length; await commit35({}, meta); });
    toast(j.photoComplete ? `เตรียมไฟล์ ${snapCount(j)} รายการ พร้อมรูป ${Object.keys(j.photos).length} รูปแล้ว` : 'เตรียมไฟล์แล้ว แต่รูปยังไม่ครบ กรุณาสำรองใหม่เมื่อออนไลน์', j.photoComplete ? 'ok' : 'warn'); updateSyncBtn();
  } catch (e) { toast('สำรองไม่สำเร็จ: ' + e.message, 'err'); }
  finally { if (button) { button.disabled = false; button.textContent = label; } }
}
function validateBackup35(j) {
  if (!j || j.app !== 'rubberfarm' || !j.data || typeof j.data !== 'object') throw new Error('ไม่ใช่ไฟล์สำรองของแอพนี้');
  for (const c of COLLS) {
    if (j.data[c] !== undefined && !Array.isArray(j.data[c])) throw new Error('โครงสร้างไฟล์ไม่ถูกต้อง: ' + c);
    const ids = new Set(); for (const r of j.data[c] || []) {
      if (!r || typeof r.id !== 'string' || !r.id || ids.has(r.id)) throw new Error('มีรายการไม่ถูกต้องหรือรหัสซ้ำ: ' + c); ids.add(r.id);
    }
  }
  if (j.photos && (typeof j.photos !== 'object' || Array.isArray(j.photos))) throw new Error('ข้อมูลรูปไม่ถูกต้อง');
  for (const src of Object.values(j.photos || {})) if (typeof src !== 'string' || !/^data:image\/(?:png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=\r\n]+$/.test(src)) throw new Error('รูปในไฟล์สำรองไม่ถูกต้อง');
}
restoreRecords = async function (j, mode = 'merge') {
  validateBackup35(j); if (!canEdit()) throw new Error('บัญชีนี้กู้คืนข้อมูลไม่ได้');
  return dataLock35(async () => {
    const updates = {}, meta = clone35(META), history = []; let n = 0;
    for (const c of COLLS) for (const raw of j.data[c] || []) {
      const r = coerce(c, raw), loc = DB[c].get(r.id);
      if (typeof Farm36 !== 'undefined' && !permitted36(c, r)) { if (c === 'auditlog') continue; throw new Error('ไม่มีสิทธิ์กู้คืนรายการนี้'); }
      if (mode !== 'replace' && loc && num(r.updatedAt) <= num(loc.updatedAt)) continue;
      if (c === 'closings' && role() !== 'owner') throw new Error('เฉพาะเจ้าของที่กู้คืนรายการปิดยอดได้');
      if (touchedClosings35(c, r, loc).some(x => x.status === 'closed')) throw new Error('ไฟล์มีรายการในเดือนที่ปิดยอด ให้เปิดงวดก่อนกู้คืน');
      // Keep the existing closing audit; a backup must never rewrite its history.
      if (c === 'closings' && loc?.closedAt) continue;
      r.updatedAt = Math.max(Date.now(), num(loc?.updatedAt) + 1, num(r.updatedAt)); r._rev = num(loc?._rev); r._mutationId = uid();
      if (touchedClosings35(c, r, loc).some(x => x.closedAt)) r.editReason = 'กู้คืนจากไฟล์สำรอง ' + (j.exportedAt || '');
      history.push({ coll: c, recId: r.id, at: Date.now(), action: 'restore', label: recLabel(c, r), reason: r.editReason || 'กู้คืนจากไฟล์สำรอง', before: loc ? clone35(loc) : null });
      (updates[c] ||= []).push(r); const ids = (meta.dirty ||= {})[c] ||= []; if (!ids.includes(r.id)) ids.push(r.id); n++;
    }
    if (j.settings) { const { scriptUrl, apiKey, ...safe } = j.settings; meta.settings = { ...safe, ...meta.settings }; }
    if (typeof Farm36 !== 'undefined') {
      const proposed = state36(); for (const [c, rows] of Object.entries(updates)) for (const r of rows) proposed[c][r.id] = r;
      for (const [c, rows] of Object.entries(updates)) for (const r of rows) { const error = Farm36.error(proposed, c, r, DB[c].get(r.id)); if (error) throw new Error('ไฟล์มีข้อมูลไม่สอดคล้อง: ' + error); }
    }
    await commit35(updates, meta, j.photos || {});
    for (const h of history) await histPut(h); histTrim(); return n;
  });
};
async function importFlow35(file) {
  try {
    const j = JSON.parse(await file.text()); validateBackup35(j);
    const ov = openSheet({ title: 'กู้คืนจากไฟล์', body: `<p>${snapCount(j)} รายการ · รูปในไฟล์ ${Object.keys(j.photos || {}).length} รูป</p><p class="small muted">${j.photoComplete === false || !j.photos ? 'ไฟล์นี้อาจมีรูปไม่ครบ รูปที่อัปโหลดแล้วต้องใช้การเชื่อมต่อเดิม' : 'มีรูปแนบในไฟล์'} · จะเก็บรายการที่มีเฉพาะในเครื่องไว้</p><label class="switch"><input type="checkbox" id="replace35">ใช้ไฟล์แทนรายการที่รหัสตรงกัน</label>`, foot: '<button class="btn" data-no>ยกเลิก</button><button class="btn pri" data-ok>กู้คืน</button>' });
    $('[data-no]', ov).onclick = () => closeSheet(ov, true);
    $('[data-ok]', ov).onclick = async e => {
      const b = e.currentTarget; b.disabled = true;
      try { await makeSnapshot('beforerestore'); const n = await restoreRecords(j, $('#replace35', ov).checked ? 'replace' : 'merge'); closeSheet(ov, true); toast(`กู้คืน ${n} รายการและรูปในไฟล์แล้ว`, 'ok'); render(); scheduleSync(); }
      catch (e) { toast('กู้คืนไม่สำเร็จ: ' + e.message, 'err'); b.disabled = false; }
    };
  } catch (e) { toast(e.message || 'ไฟล์ไม่ถูกต้อง', 'err'); }
}
importBackup = importFlow35;
makeSnapshot = async function (tag = '') {
  if (store.mode !== 'idb' || !store.db) return null;
  const j = await buildBackup35(false); if (!snapCount(j)) return null;
  const name = today() + '_' + nowTime().replace(':', '') + '_' + Date.now() + (tag ? '_' + tag : '');
  if (!(await snapPut(name, j))) return null;
  for (const k of (await snapKeys()).slice(SNAP_KEEP)) await snapDel(k);
  await dataLock35(async () => { const meta = clone35(META); meta.lastSnapAt = Date.now(); await commit35({}, meta); }); return name;
};

/* Quick actions ask for the facts that cannot safely be guessed. */
quickSale = function () {
  const last = lastSaleDefaults(); if (!list('plots').length) return openForm('sales');
  const product = last.product || 'cuplump'; const farm = defFarm();
  const plot = get('plots', last.plotId); const rememberedPlot = plot && (!farm || plot.farmId === farm) ? plot.id : '';
  let basis = last.priceBasis || 'wet'; const latest = list('prices', r => r.product === product).sort(byDateDesc)[0];
  // Recorded price history uses wet cup-lump prices and dry latex prices.
  const latestBasis = product === 'latex' ? 'dry' : 'wet';
  const ov = openSheet({ title: 'ขายยางแบบเร็ว', body: `<p class="small"><b>${esc(PRODUCTS[product])}</b>${last.buyer ? ' · ' + esc(last.buyer) : ''}</p><div class="fields">
    <div class="field half"><label class="fl" for="qsFarm35">สวน *</label><select class="inp" id="qsFarm35">${list('farms').map(f => `<option value="${esc(f.id)}"${f.id === farm ? ' selected' : ''}>${esc(f.name)}</option>`).join('')}</select></div>
    <div class="field half"><label class="fl" for="qsPlot35">แปลง</label><select class="inp" id="qsPlot35"></select></div>
    <div class="field half"><label class="fl" for="qsW">น้ำหนัก (กก.) *</label><input class="inp" id="qsW" type="number" min="0.01" step="any" inputmode="decimal"></div>
    <div class="field half"><label class="fl" for="qsP">ราคา (บาท/กก.) *</label><input class="inp" id="qsP" type="number" min="0.01" step="any" inputmode="decimal" value="${latest && latestBasis === basis ? esc(latest.price) : ''}"></div>
    ${shareProduct({ product }) ? `<div class="field"><label class="fl" for="qsBasis35">วิธีคิดราคา</label><select class="inp" id="qsBasis35"><option value="wet"${basis === 'wet' ? ' selected' : ''}>ตามน้ำหนักชั่ง</option><option value="dry"${basis === 'dry' ? ' selected' : ''}>ตามเนื้อยางแห้ง</option></select></div><div class="field half" id="qsDrcWrap35"><label class="fl" for="qsDrc35">%DRC *</label><input class="inp" id="qsDrc35" type="number" min="0.01" max="100" step="any" inputmode="decimal"></div>` : ''}
    <div class="field half"><label class="fl" for="qsDeduct35">ค่าหัก/ขนส่ง (บาท)</label><input class="inp" id="qsDeduct35" type="number" min="0" step="any" inputmode="decimal" value="0"></div>
    <div class="field"><label class="fl" for="qsReceived35">รับเงินจากผู้ซื้อ *</label><select class="inp" id="qsReceived35"><option value="">เลือกสถานะรับเงิน</option><option value="yes">รับเงินแล้ววันนี้</option><option value="no">ยังไม่ได้รับเงิน</option></select></div>
    </div><p class="hint">${last.split === 'share' ? `แบ่งเจ้าของ ${fmt(last.ownerPct ?? S().ownerPct)}% · คนกรีด ${esc(names((last.workerIds || []).filter(id => get('workers', id)))) || 'ยังไม่ได้เลือก'} — เปลี่ยนคนกรีดหรือสัดส่วนได้ที่ “กรอกแบบเต็ม”` : 'ยอดนี้ไม่แบ่งคนกรีด — เปลี่ยนได้ที่ “กรอกแบบเต็ม”'}</p><div class="pv"></div>`, foot: '<button class="btn" data-full>กรอกแบบเต็ม</button><button class="btn pri" data-save>บันทึก</button>' });
  const plots = () => { const f = $('#qsFarm35', ov).value; $('#qsPlot35', ov).innerHTML = '<option value="">รวมสวน/ไม่แยกแปลง</option>' + list('plots', p => p.farmId === f).map(p => `<option value="${esc(p.id)}"${p.id === rememberedPlot ? ' selected' : ''}>${esc(p.name)}</option>`).join(''); };
  plots();
  const draft = () => ({ date: today(), product, buyer: last.buyer || '', farmId: $('#qsFarm35', ov).value, plotId: $('#qsPlot35', ov).value,
    priceBasis: $('#qsBasis35', ov)?.value || 'wet', drc: num($('#qsDrc35', ov)?.value), weight: num($('#qsW', ov).value), price: num($('#qsP', ov).value), deduct: num($('#qsDeduct35', ov).value),
    split: last.split || 'owner', ownerPct: last.ownerPct ?? S().ownerPct, workerIds: (last.workerIds || []).filter(id => get('workers', id)), shareMode: last.shareMode || 'equal', shares: last.shares || {}, sharedCost: 0,
    received: $('#qsReceived35', ov).value === 'yes', receivedDate: $('#qsReceived35', ov).value === 'yes' ? today() : '' });
  const upd = () => { const d = draft(); if ($('#qsDrcWrap35', ov)) $('#qsDrcWrap35', ov).hidden = d.priceBasis !== 'dry'; const error = saleError35(d); $('.pv', ov).innerHTML = error ? `<p class="small muted">${esc(error)}</p>` : SCHEMA.sales.preview(d); };
  $$('input,select', ov).forEach(x => x.oninput = upd);
  $('#qsFarm35', ov).onchange = () => { plots(); upd(); };
  const bs = $('#qsBasis35', ov); if (bs) bs.onchange = () => { $('#qsP', ov).value = ''; upd(); toast('กรุณาใส่ราคาให้ตรงกับวิธีคิดที่เลือก', 'warn'); };
  $('[data-full]', ov).onclick = () => { const d = draft(); closeSheet(ov, true); openForm('sales', null, d); };
  $('[data-save]', ov).onclick = async e => {
    const d = draft(); if (!$('#qsReceived35', ov).value) return toast('เลือกสถานะรับเงินก่อนบันทึก', 'warn');
    const error = SCHEMA.sales.validate(d); if (error) return toast(error, 'warn'); const b = e.currentTarget; b.disabled = true;
    try { const r = await saveRec('sales', d); await SCHEMA.sales.afterSave?.(r, true); closeSheet(ov, true);
      undoToast(`ขาย ${fmt(d.weight, 1)} กก. · ยอดสุทธิ ${baht(saleCalc(r).net)}`, async () => { await delRec('sales', r.id); await SCHEMA.sales.afterDelete?.(r); render(); }); render(); }
    catch (e) { toast(e.message, 'warn'); b.disabled = false; }
  };
  upd(); $('#qsW', ov).focus();
};
quickTapToday = function () {
  const date = today(); const done = new Set(list('tapping', r => r.date === date).map(r => r.plotId));
  const candidates = list('plots', p => inFarm(p) && p.status === 'tapping' && !done.has(p.id) && tapDue(p, date).due);
  if (!candidates.length) return toast('วันนี้ไม่มีแปลงที่ถึงรอบกรีด', 'warn');
  const last = lastUsed('tapping'); const workers = activeWorkers();
  const ov = openSheet({ title: 'ตรวจบันทึกกรีดวันนี้', body: `<p class="small">${thDate(date)} · เลือกเฉพาะแปลงที่ทำจริง</p><div class="fields"><div class="field"><label class="fl" for="tapRain35">สภาพอากาศ *</label><select class="inp" id="tapRain35"><option value="">เลือกสภาพอากาศจริง</option>${Object.entries(RAIN).map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join('')}</select></div><div class="field half"><label class="fl" for="tapProduct35">ผลผลิต</label><select class="inp" id="tapProduct35">${Object.entries({ cuplump: 'ก้อนถ้วย', latex: 'น้ำยางสด', usss: 'ยางแผ่น' }).map(([k, l]) => `<option value="${k}"${last.product === k ? ' selected' : ''}>${l}</option>`).join('')}</select></div><div class="field half"><label class="fl" for="tapTime35">เริ่มกรีด</label><input class="inp" id="tapTime35" type="time" value="${esc(last.startTime || '')}"></div></div>${candidates.map((p, i) => `<div class="card"><label class="switch"><input type="checkbox" data-plot="${i}" checked><b>${esc(p.name)} · ${esc(farmName(p.farmId))}</b></label><div class="small muted">คนกรีด</div><div class="row wrap">${workers.map(w => `<label class="worker35"><input type="checkbox" data-worker="${i}" value="${esc(w.id)}"${(last.workerIds || []).includes(w.id) ? ' checked' : ''}> ${esc(w.name)}</label>`).join('') || '<span class="small">ยังไม่มีคนงาน เพิ่มได้ที่เมนูคนงาน</span>'}</div></div>`).join('')}`, foot: '<button class="btn" data-no>ยกเลิก</button><button class="btn pri" data-save>บันทึกที่เลือก</button>' });
  $('[data-no]', ov).onclick = () => closeSheet(ov, true);
  $('[data-save]', ov).onclick = async e => {
    const rain = $('#tapRain35', ov).value; const selected = $$('[data-plot]:checked', ov);
    if (!rain || !selected.length) return toast('เลือกแปลงและสภาพอากาศก่อน', 'warn');
    const rows = selected.map(x => { const i = num(x.dataset.plot), p = candidates[i]; return { date, farmId: p.farmId, plotId: p.id, workerIds: rain === 'skip' ? [] : $$(`[data-worker="${i}"]:checked`, ov).map(w => w.value), rain, product: $('#tapProduct35', ov).value, startTime: $('#tapTime35', ov).value, trees: rain === 'skip' ? 0 : num(p.trees) }; });
    if (rain !== 'skip' && rows.some(r => !r.workerIds.length)) return toast('เลือกคนกรีดให้ครบทุกแปลง', 'warn');
    const b = e.currentTarget; b.disabled = true; const ids = [];
    let reason = '';
    if (rows.some(r => touchedClosings35('tapping', r).some(x => x.closedAt))) {
      reason = await reasonSheet35('บันทึกหลังปิดยอด', 'ระบุเหตุผลของการเพิ่มบันทึกในงวดที่เปิดแก้ไขแล้ว');
      if (!reason) { b.disabled = false; return; }
    }
    try {
      // All records and their pending queue are committed in one transaction.
      await dataLock35(async () => {
        const meta = clone35(META); const records = [];
        for (const r of rows) {
          if (list('tapping', x => x.date === date && x.plotId === r.plotId).length) throw new Error('มีบันทึกวันนี้แล้ว กรุณาเปิดตรวจรายการ');
          if (touchedClosings35('tapping', r).some(x => x.status === 'closed')) throw new Error('เดือนนี้ปิดยอดแล้ว');
          r.id = uid(); r.createdAt = r.updatedAt = Date.now(); r._rev = 0; r._mutationId = uid(); r.deleted = 0; if (reason) r.editReason = reason;
          records.push(r); ids.push(r.id); ((meta.dirty ||= {}).tapping ||= []).push(r.id);
        }
        if (!canEdit()) throw new Error('บัญชีนี้ดูอย่างเดียว'); await commit35({ tapping: records }, meta);
        for (const r of records) await histPut({ coll: 'tapping', recId: r.id, at: Date.now(), action: 'create', label: recLabel('tapping', r), reason, before: null });
      });
      closeSheet(ov, true); undoToast(`บันทึก ${rows.length} แปลงแล้ว`, async () => { for (const id of ids) await delRec('tapping', id); render(); }); scheduleSync(); render();
    } catch (e) { toast(e.message, 'warn'); b.disabled = false; }
  };
};

/* Cash reports use settlement dates and exclude non-cash wage accruals. */
const receiveIndex35 = SCHEMA.sales.fields.findIndex(f => f.k === 'received');
SCHEMA.sales.fields.splice(receiveIndex35 + 1, 0, { k: 'receivedDate', l: 'วันที่รับเงิน', t: 'date', show: d => !!d.received, hint: 'รายการเก่าที่ไม่ระบุ จะใช้วันที่ขายและแสดงว่าเป็นวันที่ประมาณ' });
for (const c of ['payments', 'worklogs']) if (!SCHEMA[c].fields.some(f => f.k === 'farmId')) SCHEMA[c].fields.splice(1, 0, farmField({}));
SCHEMA.expenses.fields.push({ k: 'paid', l: 'จ่ายเงินแล้ว', t: 'chk', def: true }, { k: 'paidDate', l: 'วันที่จ่ายเงิน', t: 'date', show: d => d.paid !== false, hint: 'ถ้าเว้นว่างจะใช้วันที่รายจ่าย' });
const saleChange35 = SCHEMA.sales.onChange;
SCHEMA.sales.onChange = (k, d) => { saleChange35?.(k, d); if (k === 'received') d.receivedDate = d.received ? today() : ''; };
const expenseChange35 = SCHEMA.expenses.onChange;
SCHEMA.expenses.onChange = (k, d) => { expenseChange35?.(k, d); if (k === 'paid') d.paidDate = d.paid ? today() : ''; };
function cashReport35(from, to, farm = curFarm) {
  const rows = []; const belongs = r => farm === 'all' || farmOf(r) === farm;
  const add = (coll, r, date, amount, label, estimated = false) => { if (date >= from && date <= to && belongs(r)) rows.push({ coll, id: r.id, date, amount: r2(amount), label, estimated }); };
  list('sales', r => r.received).forEach(r => add('sales', r, r.receivedDate || r.date, saleCalc(r).net, 'รับค่ายาง · ' + (r.buyer || PRODUCTS[r.product]), !r.receivedDate));
  list('incomes').forEach(r => add('incomes', r, r.date, num(r.amount), 'รับอื่น · ' + (r.cat || '')));
  list('expenses', r => r.paid !== false).forEach(r => add('expenses', r, r.paidDate || r.date, -num(r.amount), 'จ่าย · ' + (r.item || r.cat || ''), !r.paidDate));
  list('payments', r => ['pay', 'advance'].includes(r.type) && r.method !== 'หักกลบ').forEach(r => add('payments', r, r.date, -num(r.amount), 'จ่ายคนงาน · ' + workerName(r.workerId)));
  rows.sort((a, b) => a.date.localeCompare(b.date));
  const recv = r2(sum(rows.filter(r => r.amount > 0), 'amount')), paid = r2(-sum(rows.filter(r => r.amount < 0), 'amount'));
  const receivable = r2(sum(list('sales', r => belongs(r) && (!r.received || (r.receivedDate || r.date) > to) && r.date <= to), r => saleCalc(r).net));
  const expenseOwed = r2(sum(list('expenses', r => belongs(r) && (r.paid === false || (r.paidDate || r.date) > to) && r.date <= to), 'amount'));
  let workerOwed = 0;
  for (const w of list('workers')) {
    const ledger = workerLedger(w.id); const bal = sum(ledger.rows.filter(x => x.date <= to && belongs(DB[x.coll].get(x.id))), 'amt'); workerOwed += Math.max(0, bal);
  }
  return { rows, recv, paid, net: r2(recv - paid), receivable, workerOwed: r2(workerOwed), expenseOwed, estimated: rows.filter(r => r.estimated).length,
    unassigned: ACCOUNT_COLLS.reduce((n, c) => n + list(c, r => !farmOf(r) && r.date <= to).length, 0) };
}
ROUTES.cash = { title: 'เงินรับ–จ่ายจริง', render(main) {
  const st = pstate('cash', () => ({ mode: 'month', ym: ymOf(today()), opening: '' }));
  const draw = () => {
    const [a, b] = periodRange(st), c = cashReport35(a, b); const p = pnl(a, b);
    main.innerHTML = `${periodNav(st)}<div class="grid2" style="margin-bottom:12px">${kpi('รับเงินจริง', baht(c.recv), '', 'cash')}${kpi('จ่ายเงินจริง', baht(c.paid), '', 'wallet')}${kpi('รับ–จ่ายสุทธิ', baht(c.net), '', 'coins', c.net < 0 ? 'neg' : 'pos')}${kpi('กำไรจากรายการ', baht(p.profit), 'รวมยอดขาย/ค่าแรงที่ยังไม่รับ–จ่าย', 'chart')}</div>
      <div class="card"><h3>เงินคงเหลือสำหรับสวน</h3><label class="fl" for="opening35">เงินต้นงวดที่ตรวจนับแล้ว (บาท)</label><input class="inp" id="opening35" type="number" step="any" inputmode="decimal" value="${esc(st.opening)}" placeholder="กรอกเมื่อทราบยอดต้นงวด"><p id="balance35" class="small"></p><div class="hint">คำนวณเงินต้นงวด + รับจริง − จ่ายจริง ไม่รวมเงินกู้หรือเงินเติมเข้าสวนที่ยังไม่ได้บันทึก</div></div>
      <div class="card"><h3>ยอดค้างสะสมถึง ${thDate(b)}</h3><dl class="kv"><dt>ค่ายางค้างรับ</dt><dd>${baht(c.receivable)}</dd><dt>ค่าแรง/ส่วนแบ่งค้างจ่าย</dt><dd>${baht(c.workerOwed)}</dd><dt>รายจ่ายที่ยังไม่จ่าย</dt><dd>${baht(c.expenseOwed)}</dd></dl></div>
      ${c.estimated ? `<div class="alert"><div class="small">${c.estimated} รายการไม่ได้ระบุวันรับ/จ่าย ใช้วันที่รายการแทน กดรายการเพื่อแก้วันที่จริง</div></div>` : ''}
      ${c.unassigned ? `<div class="alert"><div class="small">มี ${c.unassigned} รายการที่ยังไม่ระบุสวน${curFarm !== 'all' ? ' ไม่รวมในยอดสวนนี้' : ''}<br><button class="btn sm" data-go="unassigned">ตรวจรายการและระบุสวน</button></div></div>` : ''}
      <div class="row wrap" style="margin-bottom:10px"><button class="btn" id="cashCsv35">ส่งออกเงินรับ–จ่าย CSV</button><button class="btn" data-go="closing">ปิดยอดรายเดือน</button></div>
      ${c.rows.length ? `<div class="list">${c.rows.map(r => itemRow({ open: r.coll + ':' + r.id, icon: r.amount >= 0 ? 'cash' : 'wallet', t: esc(r.label), d: thDate(r.date) + (r.estimated ? ' · ใช้วันที่รายการ' : ''), r: baht(r.amount), rcls: r.amount < 0 ? 'neg' : 'pos' })).join('')}</div>` : emptyBox('ยังไม่มีเงินรับ–จ่ายในช่วงนี้', 'wallet')}`;
    bindPeriod(main, st, () => { st.opening = ''; draw(); });
    const bal = () => { $('#balance35', main).textContent = st.opening === '' ? 'ระบุเงินต้นงวดเพื่อดูยอดคงเหลือ' : 'เงินปลายงวดตามบันทึก ' + baht(num(st.opening) + c.net); };
    $('#opening35', main).oninput = e => { st.opening = e.target.value; bal(); }; bal();
    $('#cashCsv35', main).onclick = () => downloadFile('เงินรับจ่าย_' + today() + '.csv', '\ufeff' + [['วันที่', 'รายการ', 'รับ', 'จ่าย', 'วันที่ประมาณ'], ...c.rows.map(r => [r.date, r.label, r.amount > 0 ? r.amount : 0, r.amount < 0 ? -r.amount : 0, r.estimated ? 'ใช่' : ''])].map(r => r.map(csvCell).join(',')).join('\r\n'), 'text/csv');
  }; draw();
} };
ROUTES.unassigned = { title: 'รายการที่ยังไม่ระบุสวน', render(main) {
  const entries = ACCOUNT_COLLS.flatMap(c => list(c, r => !farmOf(r)).map(r => [c, r]));
  main.innerHTML = '<div class="card"><p class="small">กดรายการเพื่อระบุสวน รายการที่ผูกกับแปลงจะใช้สวนของแปลงนั้น ถ้ามีสวนเดียวจะจัดให้สวนเดียวโดยอัตโนมัติ</p></div>' +
    (entries.length ? `<div class="list">${entries.map(([c, r]) => itemRow({ open: c + ':' + r.id, icon: SCHEMA[c].icon, t: esc(recLabel(c, r)), d: thDate(r.date) + ' · ' + esc(SCHEMA[c].title) })).join('')}</div>` : emptyBox('ระบุสวนครบแล้ว', 'check'));
} };

function closingSummary35(farm, month) {
  const from = month + '-01', to = lastDay(month); const p = pnl(from, to, farm), c = cashReport35(from, to, farm);
  return { sales: p.net, labor: p.labor, expenses: p.expenses, profit: p.profit, cashIn: c.recv, cashOut: c.paid, cashNet: c.net, receivable: c.receivable, workerOwed: c.workerOwed, expenseOwed: c.expenseOwed, estimatedDates: c.estimated };
}
function closingVersions35() {
  const versions = [];
  for (const c of [...ACCOUNT_COLLS, 'plots']) for (const r of DB[c].values()) if (!r.deleted) versions.push(c + '|' + r.id + '|' + num(r._rev));
  return versions.sort();
}
function closingBlockers35(farm, month) {
  const reasons = []; if (month >= ymOf(today())) reasons.push('ปิดยอดได้เมื่อสิ้นเดือนแล้ว');
  if (syncing) reasons.push('รอการซิงค์ให้เสร็จก่อน');
  if (S().scriptUrl && (!navigator.onLine || dirtyCount() || Object.keys(META.conflicts || {}).length || META.syncProtocol !== 2 || syncErr)) reasons.push('ต้องออนไลน์และซิงค์ข้อมูลให้ครบก่อนปิดยอด');
  const to = lastDay(month);
  if (ACCOUNT_COLLS.some(c => list(c, r => !farmOf(r) && r.date <= to).length)) reasons.push('มีรายการไม่ระบุสวน กรุณาระบุสวนก่อนปิดยอด');
  return reasons;
}
ROUTES.closing = { title: 'ปิดยอดรายเดือน', render(main) {
  const st = pstate('closing', () => ({ month: shiftYM(ymOf(today()), -1), farm: defFarm() }));
  const draw = () => {
    if (curFarm !== 'all') st.farm = curFarm;
    const record = get('closings', closingId35(st.farm, st.month)); const closed = record?.status === 'closed';
    const summary = closed ? record.summary : closingSummary35(st.farm, st.month);
    const labels = { sales: 'ขายยางสุทธิ', labor: 'ค่าแรง/ส่วนแบ่ง', expenses: 'รายจ่าย', profit: 'กำไร', cashIn: 'รับเงินจริง', cashOut: 'จ่ายเงินจริง', cashNet: 'เงินรับ–จ่ายสุทธิ', receivable: 'ค่ายางค้างรับ', workerOwed: 'ค่าแรงค้างจ่าย', expenseOwed: 'รายจ่ายค้างจ่าย' };
    const blockers = closingBlockers35(st.farm, st.month);
    main.innerHTML = `<div class="card"><h3>ตรวจยอดก่อนยืนยัน</h3><div class="fields"><div class="field half"><label class="fl" for="closeFarm35">สวน</label><select class="inp" id="closeFarm35"${curFarm !== 'all' ? ' disabled' : ''}>${list('farms').map(f => `<option value="${esc(f.id)}"${f.id === st.farm ? ' selected' : ''}>${esc(f.name)}</option>`).join('')}</select></div><div class="field half"><label class="fl" for="closeMonth35">เดือน</label><input class="inp" id="closeMonth35" type="month" value="${esc(st.month)}"></div></div><p><span class="badge ${closed ? '' : 'amber'}">${closed ? 'ปิดยอดแล้ว' : record?.closedAt ? 'เปิดให้แก้ไขแล้ว' : 'ยังไม่ปิดยอด'}</span></p><dl class="kv">${Object.entries(labels).map(([k, label]) => `<dt>${label}</dt><dd>${baht(summary[k])}</dd>`).join('')}</dl>
      ${summary.estimatedDates ? `<p class="hint">มี ${summary.estimatedDates} รายการใช้วันที่รายการแทนวันรับ/จ่าย กรุณาตรวจวันที่ก่อนยืนยัน</p>` : ''}<p class="hint">ยอดค้างเป็นยอดสะสมถึงสิ้นเดือน เมื่อปิดยอดแล้วตัวเลขชุดนี้จะเก็บไว้ การแก้รายการต้องเปิดงวดพร้อมเหตุผล</p>
      <div class="row wrap"><button class="btn" id="closeCsv35">ดาวน์โหลดสรุป CSV</button>${role() === 'owner' ? closed ? '<button class="btn" id="reopen35">เปิดงวดเพื่อแก้ไข</button>' : `<button class="btn pri" id="close35"${blockers.length || !st.farm ? ' disabled' : ''}>ยืนยันปิดยอด</button>` : '<span class="small muted">เจ้าของเท่านั้นที่ยืนยันได้</span>'}</div>${!closed && blockers.length ? `<p class="small warn">${blockers.map(esc).join('<br>')}</p>` : ''}${!S().scriptUrl ? '<p class="hint">ยังไม่เชื่อม Sheets การปิดยอดมีผลในเครื่องนี้ ควรสำรองไฟล์หลังปิดยอด</p>' : ''}</div>
      <div class="card"><h3>ประวัติปิด/เปิดงวด</h3>${(record?.audit || []).slice().reverse().map(x => `<p class="small"><b>${x.action === 'close' ? 'ปิดยอด' : 'เปิดงวด'}</b> · ${esc(x.user)} · ${new Date(x.at).toLocaleString('th-TH')}<br>${esc(x.reason || '')}</p>`).join('') || '<p class="muted small">ยังไม่มีประวัติ</p>'}</div>`;
    $('#closeFarm35', main).onchange = e => { st.farm = e.target.value; draw(); }; $('#closeMonth35', main).onchange = e => { if (e.target.value) { st.month = e.target.value; draw(); } };
    $('#closeCsv35', main).onclick = () => downloadFile(`ปิดยอด_${st.month}.csv`, '\ufeff' + [['สวน', farmName(st.farm)], ['เดือน', st.month], ...Object.entries(labels).map(([k, l]) => [l, summary[k]])].map(r => r.map(csvCell).join(',')).join('\r\n'), 'text/csv');
    const close = $('#close35', main); if (close) close.onclick = async () => {
      close.disabled = true;
      try {
        if (S().scriptUrl) await sync(false);
        const problems = closingBlockers35(st.farm, st.month); if (problems.length) throw new Error(problems.join(' · '));
        if (!(await confirmBox(`ยืนยันยอด ${farmName(st.farm)} เดือน ${thYM(st.month)}? หลังยืนยันต้องเปิดงวดก่อนแก้`, 'ปิดยอด', false))) return;
        const at = Date.now(); const prior = get('closings', closingId35(st.farm, st.month));
        await saveRec('closings', { ...prior, id: closingId35(st.farm, st.month), date: today(), month: st.month, farmId: st.farm, status: 'closed', closedAt: at, summary: closingSummary35(st.farm, st.month), versions: closingVersions35(), reason: 'ตรวจยอดและยืนยัน', audit: [...(prior?.audit || []), { action: 'close', at, user: META.auth?.user || 'เจ้าของ', reason: 'ตรวจยอดและยืนยัน' }] });
        if (S().scriptUrl) await sync(true); toast('บันทึกการปิดยอดในเครื่องแล้ว', 'ok'); draw();
      } catch (e) { toast(e.message, 'warn'); } finally { if (close.isConnected) close.disabled = false; }
    };
    const reopen = $('#reopen35', main); if (reopen) reopen.onclick = async () => {
      const reason = await reasonSheet35('เปิดงวดเพื่อแก้ไข', 'เหตุผลนี้จะเก็บในประวัติและส่งให้ทุกเครื่อง'); if (!reason) return;
      try { const at = Date.now(); await saveRec('closings', { ...record, status: 'open', reason, audit: [...(record.audit || []), { action: 'reopen', at, user: META.auth?.user || 'เจ้าของ', reason }] }); if (S().scriptUrl) await sync(true); draw(); } catch (e) { toast(e.message, 'warn'); }
    };
  }; draw();
} };

/* Home preferences and clear data status. */
const HOME_ACTIONS35 = { tap: ['กรีดวันนี้', 'drop', () => quickTapToday()], sale: ['ขายยาง', 'coins', () => quickSale()], pay: ['จ่ายคนงาน', 'wallet', () => openForm('payments')], expense: ['รายจ่าย', 'receipt', () => openForm('expenses')], cash: ['เงินรับ–จ่าย', 'cash', () => go('cash')], closing: ['ปิดยอด', 'shieldck', () => go('closing')], weather: ['อากาศ', 'sun', () => go('weather')] };
function dataStatusHtml35() {
  const pending = dirtyCount(), conflicts = Object.keys(META.conflicts || {}).length;
  const state = syncing ? 'กำลังส่งข้อมูล...' : !S().scriptUrl ? 'เก็บข้อมูลในเครื่องนี้' : !navigator.onLine ? 'ออฟไลน์ · เก็บข้อมูลในเครื่องแล้ว' : syncErr ? 'ส่งข้อมูลยังไม่สำเร็จ' : pending ? `เก็บในเครื่องแล้ว · รอส่ง ${pending} รายการ` : META.lastSyncAt ? 'ส่งข้อมูลและรับคำยืนยันครบแล้ว' : 'เก็บในเครื่องแล้ว · ยังไม่เคยซิงค์';
  return `<div class="row wrap"><b class="small">${esc(state)}</b><span class="sp"></span><button class="btn sm" data-go="safety">สำรอง/กู้คืน</button></div>${syncErr ? `<p class="xs warn">${esc(syncErr)}</p>` : ''}<div class="xs muted">ไฟล์สำรองล่าสุด ${META.lastBackupAt ? new Date(META.lastBackupAt).toLocaleString('th-TH') + (META.lastBackupComplete === false ? ' · รูปไม่ครบ' : '') : 'ยังไม่มี'}</div>${conflicts ? `<button class="btn sm" data-go="conflicts" style="margin-top:8px">ตรวจ ${conflicts} รายการที่ยังส่งไม่ได้</button>` : ''}`;
}
function homePreferences35() {
  const selected = S().homeActions || ['tap', 'sale', 'pay', 'expense'];
  const ov = openSheet({ title: 'เลือกปุ่มประจำ', body: `<p class="small">เลือกได้ 2–5 ปุ่ม</p>${Object.entries(HOME_ACTIONS35).map(([key, [label]]) => `<label class="switch"><input type="checkbox" value="${key}"${selected.includes(key) ? ' checked' : ''}>${label}</label>`).join('')}`, foot: '<button class="btn pri" data-save>บันทึก</button>' });
  $('[data-save]', ov).onclick = async () => { const ids = $$('input:checked', ov).map(i => i.value); if (ids.length < 2 || ids.length > 5) return toast('เลือก 2–5 ปุ่มครับ', 'warn'); await setS({ homeActions: ids }); closeSheet(ov, true); render(); };
}
const homeRaw35 = ROUTES.home.render;
ROUTES.home.render = function (main) {
  homeRaw35.call(this, main);
  // Replace repeated shortcut grids with one user-selected group.
  $$('.quick,#qkBar,.big-grid', main).forEach(x => x.remove());
  const quick = document.createElement('section'); quick.className = 'card'; quick.id = 'homeActions35';
  const keys = (S().homeActions || ['tap', 'sale', 'pay', 'expense']).filter(k => HOME_ACTIONS35[k]);
  quick.innerHTML = `<h3>งานประจำวัน<span class="sp"></span><button class="link" id="pickActions35">เลือกปุ่ม</button></h3><div class="actions35">${keys.map(k => `<button class="btn" data-action35="${k}">${ic(HOME_ACTIONS35[k][1])}<span>${HOME_ACTIONS35[k][0]}</span></button>`).join('')}</div>`;
  main.prepend(quick); $('#pickActions35', quick).onclick = homePreferences35;
  $$('[data-action35]', quick).forEach(b => b.onclick = HOME_ACTIONS35[b.dataset.action35][2]);
  const status = document.createElement('section'); status.className = 'card'; status.id = 'dataStatus35'; status.setAttribute('aria-live', 'polite'); status.innerHTML = dataStatusHtml35(); main.prepend(status);
};
function backupUi35(main) {
  if ($('#backupRemote35', main)) return;
  const button = $('#fBackup', main) || $('#bExp', main); if (!button) return;
  button.onclick = () => exportBackup35(button);
  const label = document.createElement('label'); label.className = 'switch small'; label.innerHTML = '<input type="checkbox" id="backupRemote35" checked>รวมรูปจากคลาวด์ด้วย (รูปในเครื่องรวมเสมอ)'; button.parentElement.after(label);
  const input = $('#fRestore', main) || $('#bImp', main); if (input) input.onchange = e => { const file = e.target.files[0]; if (file) importFlow35(file); e.target.value = ''; };
}
const safetyRaw35 = ROUTES.safety.render;
ROUTES.safety.render = function (main) { safetyRaw35.call(this, main); backupUi35(main); };
const settingsRaw35 = ROUTES.settings.render;
ROUTES.settings.render = function (main) { settingsRaw35.call(this, main); backupUi35(main); const el = document.createElement('div'); el.className = 'card'; el.innerHTML = '<h3>หน้าหลักและข้อมูล</h3><div class="row wrap"><button class="btn" id="homePrefs35">เลือกปุ่มประจำ</button><button class="btn" data-go="conflicts">ตรวจรายการซิงค์</button><button class="btn" data-go="cash">เงินรับ–จ่ายจริง</button><button class="btn" data-go="closing">ปิดยอดรายเดือน</button></div>'; main.prepend(el); $('#homePrefs35', el).onclick = homePreferences35; };
const menuRaw35 = ROUTES.menu.render;
ROUTES.menu.render = function (main) {
  menuRaw35.call(this, main);
  main.insertAdjacentHTML('beforeend', '<div class="sec-title">บัญชีและข้อมูล</div><div class="menu-grid"></div>');
  addMenuItems({ 'บัญชีและข้อมูล': [['cash', 'cash', 'เงินรับ–จ่ายจริง'], ['closing', 'shieldck', 'ปิดยอดรายเดือน'], ['conflicts', 'sync', 'ตรวจรายการซิงค์']] });
};
const css35 = document.createElement('style'); css35.textContent = '.actions35{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.actions35 .btn{min-height:56px;justify-content:flex-start}.compare35{white-space:pre-wrap;overflow-wrap:anywhere;font-size:11px;max-height:280px;overflow:auto;background:var(--card2);border:1px solid var(--line);padding:8px;border-radius:10px}.worker35{padding:8px 4px;min-height:44px;display:inline-flex;align-items:center;gap:4px}@media(max-width:420px){.compare35{font-size:10px}}'; document.head.appendChild(css35);
