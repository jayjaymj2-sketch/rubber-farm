'use strict';
/* Storage, forms and reporting adapters. Accounting itself lives in owner-domain.js. */
for (const c of ['rubberlots', 'settlements', 'budgets', 'tasks', 'healthchecks', 'auditlog']) { if (!COLLS.includes(c)) COLLS.push(c); DB[c] ||= new Map(); }
for (const c of ['settlements', 'tasks', 'healthchecks']) if (!PHOTO_COLLS.includes(c)) PHOTO_COLLS.push(c);
ACCOUNT_COLLS.push('settlements', 'rubberlots');
const state36 = () => Object.fromEntries(COLLS.map(c => [c, Object.fromEntries(DB[c])]));
const ownerMode36 = () => S().ownerView !== false && role() === 'owner';
const lastUsedBefore36 = lastUsed;
lastUsed = function(coll) {
  const last = lastUsedBefore36(coll);
  // New owner sales use the current agreement; historical records keep their own shares.
  return ownerMode36() && coll === 'sales' ? { ...last, ownerPct: 55 } : last;
};
saleCalc = Farm36.sale;
saleError35 = d => Farm36.error(state36(), 'sales', d);
const coerceBefore36 = coerce;
coerce = function(c, raw) {
  const r = coerceBefore36(c, raw);
  for (const k of ['lotAllocations', 'tappingIds', 'readColls', 'writeColls', 'farmIds', 'plotIds']) if (raw[k] !== undefined) r[k] = Farm36.arr(raw[k]);
  if (raw.installments !== undefined) r.installments = Farm36.yes(raw.installments);
  return r;
};
const field36 = (k, l, t = 'text', extra = {}) => ({ k, l, t, ...extra });
const f36 = extra => field36('farmId', 'สวน', 'ref', { coll: 'farms', label: f => f.name, def: defFarm, req: 1, ...extra });
SCHEMA.rubberlots = { title: 'ยางเก็บไว้เป็นล็อต', icon: 'box', fields: [
  field36('name', 'ชื่อล็อต', 'text', { req: 1, def: () => 'ยางเก็บ ' + thDate(today()) }),
  field36('date', 'วันที่รับเข้าล็อต', 'date', { def: today, req: 1 }), f36(), refPlot({}),
  field36('product', 'ชนิดยาง', 'sel', { opt: PRODUCTS, def: 'cuplump', req: 1 }),
  field36('weight', 'น้ำหนักที่เก็บ (กก.)', 'num', { req: 1 }), field36('lossKg', 'น้ำหนักลดจากความชื้น/สูญเสีย (กก.)', 'num', { def: 0, hint: 'กรอกยอดลดสะสมที่ตรวจพบ ไม่หักยอดขายในช่องนี้' }),
  field36('tappingIds', 'บันทึกกรีดที่รวมในล็อต (ถ้ามี)', 'mref', { coll: 'tapping', label: t => thDate(t.date) + ' ' + plotName(t.plotId), filter: (t, d) => farmOf(t) === d.farmId && t.product === d.product && t.rain !== 'skip' }),
  field36('note', 'หมายเหตุ', 'area') ], validate: d => Farm36.error(state36(), 'rubberlots', d), preview: d => `<div class="preview">ยางเหลือ ${fmt(Farm36.lot(state36(), d).available, 2)} กก.</div>` };
SCHEMA.settlements = { title: 'รับ/จ่ายเงินเป็นงวด', icon: 'cash', fields: [
  field36('date', 'วันที่รับ/จ่ายจริง', 'date', { def: today, req: 1 }), f36(),
  field36('kind', 'ประเภท', 'sel', { opt: { receive: 'รับค่ายาง', expense: 'จ่ายรายจ่าย', transport: 'จ่ายค่ารถ' }, def: 'receive', re: 1 }),
  field36('saleId', 'รายการขาย', 'ref', { coll: 'sales', label: s => thDate(s.date) + ' ' + (s.buyer || '') + ' ' + baht(saleCalc(s).net), show: d => d.kind !== 'expense', req: 1 }),
  field36('expenseId', 'รายจ่ายต้นทาง', 'ref', { coll: 'expenses', label: x => thDate(x.date) + ' ' + (x.item || x.cat || '') + ' ' + baht(x.amount), show: d => d.kind === 'expense', req: 1 }),
  field36('amount', 'จำนวนเงิน (บาท)', 'num', { req: 1 }), field36('method', 'ช่องทาง', 'sel', { opt: ['เงินสด', 'โอนเงิน'], def: 'เงินสด' }),
  field36('photos', 'หลักฐานรับ/จ่าย', 'photos', { max: 2 }), field36('note', 'หมายเหตุ', 'area') ], validate: d => Farm36.error(state36(), 'settlements', d) };
SCHEMA.budgets = { title: 'งบและเป้าหมาย', icon: 'chart', fields: [
  field36('month', 'เดือน', 'month', { req: 1, def: () => ymOf(today()) }), f36(), refPlot({}),
  field36('product', 'ชนิดยางสำหรับเป้าหมาย', 'sel', { opt: PRODUCTS, def: 'cuplump' }),
  field36('expenseLimit', 'งบดูแลสวนและค่ารถ (บาท)', 'num', { req: 1, hint: 'รวมรายจ่าย ค่าแรงรายวัน และค่ารถ ไม่รวมส่วนแบ่งคนกรีด' }),
  field36('targetKg', 'เป้าหมายขายตามน้ำหนักชั่ง (กก.)', 'num', { def: 0, req: 1 }), field36('note', 'หมายเหตุ', 'area') ], validate: d => Farm36.error(state36(), 'budgets', d) };
const TASK_CHECKS36 = ['ตรวจพื้นที่', 'เตรียมวัสดุ', 'ทำงานแล้ว', 'ตรวจงานเรียบร้อย'];
SCHEMA.tasks = { title: 'งานที่มอบหมาย', icon: 'check', fields: [
  field36('title', 'งานที่ให้ทำ', 'text', { req: 1 }), field36('date', 'กำหนดเสร็จ', 'date', { req: 1, def: today }), f36(), refPlot({}),
  field36('workerId', 'คนรับผิดชอบ', 'ref', { coll: 'workers', label: w => w.name, req: 1 }),
  field36('status', 'สถานะ', 'seg', { opt: { todo: 'รอทำ', doing: 'กำลังทำ', done: 'เสร็จแล้ว' }, def: 'todo' }),
  field36('checklist', 'ตรวจตามรายการ', 'mchk', { opt: TASK_CHECKS36 }), field36('photos', 'รูปงาน/หลังทำ', 'photos', { max: 4 }), field36('note', 'รายละเอียด', 'area') ], validate: d => Farm36.error(state36(), 'tasks', d) };
SCHEMA.healthchecks = { title: 'ติดตามต้นยาง', icon: 'leaf', fields: [
  field36('healthId', 'ปัญหาต้นยางที่ติดตาม', 'ref', { coll: 'health', label: h => plotName(h.plotId) + ' · ' + (h.treeTag || h.issue || h.note || thDate(h.date)), req: 1 }),
  field36('date', 'วันที่ตรวจซ้ำ', 'date', { req: 1, def: today }), f36(),
  field36('result', 'ผลที่พบ', 'seg', { opt: { better: 'ดีขึ้น', same: 'เหมือนเดิม', worse: 'แย่ลง', recovered: 'ฟื้นตัวแล้ว' }, def: 'same' }),
  field36('nextDate', 'นัดตรวจครั้งถัดไป', 'date'), field36('photos', 'รูปตอนติดตาม', 'photos', { max: 4 }), field36('note', 'สิ่งที่ทำและผลที่พบ', 'area') ],
  onChange: (k, d) => { if (k === 'healthId') { const h = get('health', d.healthId); if (h) { d.farmId = farmOf(h); d.plotId = h.plotId || ''; } } }, validate: d => Farm36.error(state36(), 'healthchecks', d) };
SCHEMA.auditlog = { title: 'ประวัติทีม', icon: 'shieldck', fields: [field36('date', 'วันที่', 'date'), field36('actor', 'ผู้ทำรายการ'), field36('action', 'การเปลี่ยนแปลง'), field36('coll', 'หมวด'), field36('recId', 'รายการ'), field36('reason', 'เหตุผล', 'area')] };
SCHEMA.health.fields.push(field36('treeTag', 'เลขต้น/จุดที่ทำเครื่องหมาย'));
SCHEMA.expenses.fields.push(field36('vendor', 'ผู้รับเงิน/ร้านค้า'), field36('dueDate', 'วันครบกำหนดจ่าย', 'date'));
SCHEMA.expenses.fields.find(f => f.k === 'cat').hint = 'ค่ารถที่กรอกตอนขายยางนับในบัญชีแล้ว ไม่ต้องลงรายจ่ายซ้ำ';
const salesFields36 = SCHEMA.sales.fields;
SCHEMA.workers.fields.find(f => f.k === 'ownerPct').def = 55;
salesFields36.find(x => x.k === 'deduct').l = 'รายการหักอื่นบนใบชั่ง (ไม่รวมค่ารถ)';
salesFields36.find(x => x.k === 'ownerPct').def = 55;
salesFields36.splice(salesFields36.findIndex(x => x.k === 'deduct') + 1, 0,
  field36('transportCost', 'ค่ารถขนยาง (บาท)', 'num', { def: 0 }),
  field36('transportPayer', 'ใครรับผิดชอบค่ารถ', 'seg', { opt: { owner: 'พ่อจ่ายจากส่วนของพ่อ', shared: 'หักค่ารถก่อนแบ่งตามสัดส่วน' }, def: () => S().transportPayer || '', re: 1 }),
  field36('transportMethod', 'วิธีจ่ายค่ารถ', 'seg', { opt: { separate: 'พ่อจ่ายค่ารถต่างหาก', withheld: 'ผู้ซื้อหักจากเงินค่ายาง' }, def: 'separate' }));
salesFields36.push(field36('dueDate', 'วันครบกำหนดรับเงิน', 'date'));
for (const [c, k] of [['sales', 'received'], ['sales', 'receivedDate'], ['expenses', 'paid'], ['expenses', 'paidDate']]) {
  const f = SCHEMA[c].fields.find(x => x.k === k), show = f.show; f.show = d => !Farm36.yes(d.installments) && (!show || show(d));
}
SCHEMA.sales.validate = d => Farm36.error(state36(), 'sales', d);
const changeBefore36 = SCHEMA.sales.onChange;
SCHEMA.sales.onChange = (k, d, isNew) => { changeBefore36?.(k, d, isNew); if (isNew && ownerMode36() && k === 'workerIds') d.ownerPct = 55; };
const previewBefore36 = SCHEMA.sales.preview;
SCHEMA.sales.preview = d => {
  if (!(num(d.weight) && num(d.price))) return '';
  const c = saleCalc(d);
  return `<div class="preview"><dl class="kv"><dt>ยอดยางก่อนหัก</dt><dd>${baht(c.gross)}</dd><dt>รายการหักอื่น</dt><dd>${baht(d.deduct)}</dd><dt>ค่ารถ · ${d.transportPayer === 'shared' ? 'หักก่อนแบ่ง' : 'พ่อรับผิดชอบ'}</dt><dd>${baht(d.transportCost)}</dd><dt>คนกรีดรวม ${fmt(100 - c.ownerPct)}%</dt><dd>${baht(c.tapperTotal)}</dd>${c.ids.map(id => `<dt>${esc(workerName(id))}</dt><dd>${baht(c.per[id])}</dd>`).join('')}<dt>ผู้ซื้อต้องจ่าย</dt><dd>${baht(c.net)}</dd></dl><hr class="sep"><div class="row"><b>ส่วนของพ่อหลังค่ารถ</b><span class="sp"></span><b class="big">${baht(c.ownerAfterTransport)}</b></div><p class="hint">เป็นส่วนแบ่งจากการขาย ยังไม่หักค่าใช้จ่ายดูแลสวนอื่น และไม่ใช่ยอดรับเงินจริง</p></div>`;
};
function permitted36(c, r, write = true) {
  return Farm36.access(state36(), { role: role(), ...(META.auth?.permissions || {}) }, c, r, write);
}
function validate36(c, r, before) {
  if (!permitted36(c, r) || (before && !permitted36(c, before))) throw new Error('บัญชีนี้ไม่มีสิทธิ์แก้รายการนี้');
  const error = Farm36.error(state36(), c, r, before); if (error) throw new Error(error);
  if (c === 'tasks' && r.status === 'done' && Farm36.arr(r.checklist).length < TASK_CHECKS36.length) throw new Error('ตรวจรายการงานให้ครบก่อนระบุว่าเสร็จ');
}
const pnlBefore36 = pnl;
pnl = function(from, to, farm = curFarm) {
  const p = clone35(pnlBefore36(from, to, farm)); // Never mutate the cached summary.
  const transport = sum(list('sales', r => r.date >= from && r.date <= to && (farm === 'all' || farmOf(r) === farm) && r.transportMethod === 'separate'), 'transportCost');
  p.expenses = r2(p.expenses + transport); p.expByCat['ค่าขนส่ง'] = r2(num(p.expByCat['ค่าขนส่ง']) + transport);
  p.cost = r2(p.cost + transport); p.profit = r2(p.profit - transport); return p;
};
const saleOwed36 = r => Farm36.outstanding(state36(), 'receive', r);
cashReport35 = function(from, to, farm = curFarm) {
  const s = state36(), rows = [], belongs = r => farm === 'all' || farmOf(r) === farm;
  const add = (c, r, date, amount, label, estimated = false, settlementId = '') => { if (date >= from && date <= to && belongs(r)) rows.push({ coll: settlementId ? 'settlements' : c, id: settlementId || r.id, date, amount: r2(amount), label, estimated }); };
  let receivable = 0, expenseOwed = 0;
  list('sales', belongs).forEach(r => {
    for (const x of Farm36.settlementRows(s, 'receive', r)) add('sales', r, x.date, x.amount, 'รับค่ายาง · ' + (r.buyer || PRODUCTS[r.product]), x.estimated, x.id.startsWith('legacy:') ? '' : x.id);
    if (r.date <= to) receivable += Farm36.outstanding(s, 'receive', r, to);
    if (r.transportMethod === 'separate') {
      for (const x of Farm36.settlementRows(s, 'transport', r)) add('sales', r, x.date, -num(x.amount), 'จ่ายค่ารถขนยาง', false, x.id);
      if (r.date <= to) expenseOwed += Farm36.outstanding(s, 'transport', r, to);
    }
  });
  list('expenses', belongs).forEach(r => {
    for (const x of Farm36.settlementRows(s, 'expense', r)) add('expenses', r, x.date, -num(x.amount), 'จ่าย · ' + (r.item || r.cat || ''), x.estimated, x.id.startsWith('legacy:') ? '' : x.id);
    if (r.date <= to) expenseOwed += Farm36.outstanding(s, 'expense', r, to);
  });
  list('incomes').forEach(r => add('incomes', r, r.date, num(r.amount), 'รับอื่น · ' + (r.cat || '')));
  list('payments', r => ['pay', 'advance'].includes(r.type) && r.method !== 'หักกลบ').forEach(r => add('payments', r, r.date, -num(r.amount), 'จ่ายคนกรีด · ' + workerName(r.workerId)));
  const recv = r2(sum(rows.filter(r => r.amount > 0), 'amount')), paid = r2(-sum(rows.filter(r => r.amount < 0), 'amount'));
  // Include archived workers: an unpaid balance still needs to be settled.
  const workerIds = new Set([...DB.workers.keys(), ...list('sales').flatMap(r => r.workerIds || []), ...list('payments').map(r => r.workerId), ...list('worklogs').map(r => r.workerId)]);
  let workerOwed = 0; for (const id of workerIds) workerOwed += Math.max(0, sum(workerLedger(id).rows.filter(x => x.date <= to && belongs(DB[x.coll].get(x.id))), 'amt'));
  rows.sort((a, b) => a.date.localeCompare(b.date));
  return { rows, recv, paid, net: r2(recv - paid), receivable: r2(receivable), workerOwed: r2(workerOwed), expenseOwed: r2(expenseOwed), estimated: rows.filter(x => x.estimated).length,
    unassigned: ACCOUNT_COLLS.reduce((a, c) => a + list(c, r => !farmOf(r) && r.date <= to).length, 0) };
};
async function saveBatch36(entries) {
  let reason = '';
  if (entries.some(([c, r]) => touchedClosings35(c, r, DB[c].get(r.id)).some(x => x.status === 'closed'))) throw new Error('เดือนนี้ปิดยอดแล้ว ให้เปิดงวดก่อน');
  if (entries.some(([c, r]) => touchedClosings35(c, r, DB[c].get(r.id)).some(x => x.closedAt))) {
    reason = await reasonSheet35('แก้ข้อมูลหลังปิดยอด', 'ระบุเหตุผลของการเปลี่ยนข้อมูล'); if (!reason) throw new Error('ยกเลิก');
  }
  return dataLock35(async () => {
    const s = state36(), updates = {}, meta = clone35(META), history = [];
    for (const [c, raw] of entries) {
      const before = DB[c].get(raw.id); if (before && num(before.updatedAt) !== num(raw.updatedAt)) throw new Error('รายการเปลี่ยนระหว่างกรอก กรุณาเปิดใหม่');
      if (!permitted36(c, raw) || (before && !permitted36(c, before))) throw new Error('ไม่มีสิทธิ์บันทึกรายการนี้');
      if (touchedClosings35(c, raw, before).some(x => x.status === 'closed')) throw new Error('เดือนนี้ปิดยอดแล้ว');
      const r = { ...clone35(raw), id: raw.id || uid(), createdAt: before?.createdAt || Date.now(), updatedAt: Math.max(Date.now(), num(before?.updatedAt) + 1), _rev: num(before?._rev), _mutationId: uid(), deleted: raw.deleted ? 1 : 0 };
      if (reason) r.editReason = reason;
      const error = Farm36.error(s, c, r, before); if (error) throw new Error(error);
      s[c][r.id] = r; (updates[c] ||= []).push(r); const dirty = (meta.dirty ||= {})[c] ||= []; if (!dirty.includes(r.id)) dirty.push(r.id);
      history.push({ coll: c, recId: r.id, at: Date.now(), action: before ? 'edit' : 'create', label: recLabel(c, r), reason, before: before || null });
    }
    await commit35(updates, meta); for (const h of history) await histPut(h); scheduleSync(); return updates;
  });
}
async function enableInstallments36(c, r) {
  if (Farm36.yes(r.installments)) return r;
  const kind = c === 'sales' ? 'receive' : 'expense', legacy = Farm36.settlementRows(state36(), kind, r);
  if (!legacy.length) return r; // An unpaid legacy sale can receive money in a later month without reopening its sale month.
  const entries = [[c, { ...r, installments: true }]];
  for (const x of legacy) entries.push(['settlements', { date: x.date, amount: x.amount, kind, farmId: farmOf(r), ...(c === 'sales' ? { saleId: r.id } : { expenseId: r.id }), method: 'เงินสด', note: 'ยกยอดรับ/จ่ายเดิมก่อนเปิดใช้เงินเป็นงวด' }]);
  const result = await saveBatch36(entries); return result[c][0];
}
function budgetActual36(r) {
  const from = r.month + '-01', to = lastDay(r.month), belongs = x => farmOf(x) === r.farmId && (!r.plotId || x.plotId === r.plotId), inPeriod = x => x.date >= from && x.date <= to && belongs(x);
  const sales = list('sales', inPeriod), expenses = list('expenses', inPeriod), wages = list('worklogs', inPeriod);
  const kg = sum(sales.filter(x => x.product === r.product), 'weight');
  const cost = sum(expenses, 'amount') + sum(wages, wageAmt) + sum(sales, 'transportCost');
  const unassigned = r.plotId ? list('expenses', x => x.date >= from && x.date <= to && farmOf(x) === r.farmId && !x.plotId).length + list('sales', x => x.date >= from && x.date <= to && farmOf(x) === r.farmId && !x.plotId).length : 0;
  return { kg: r2(kg), cost: r2(cost), over: r2(Math.max(0, cost - num(r.expenseLimit))), unassigned };
}
async function clearScopedHistory36() {
  memHist.length = 0;
  if (store.mode !== 'idb' || !store.db) return;
  await new Promise((resolve, reject) => {
    const tx = store.db.transaction(['rec', 'meta'], 'readwrite');
    for (const [name, prefix] of [['rec', HIST_PRE], ['meta', SNAP_PRE]]) {
      const q = tx.objectStore(name).openCursor(); q.onsuccess = () => { const cur = q.result; if (!cur) return; if (String(cur.key).startsWith(prefix)) cur.delete(); cur.continue(); };
    }
    tx.oncomplete = resolve; tx.onabort = tx.onerror = () => reject(tx.error || new Error('ปรับข้อมูลตามสิทธิ์ไม่สำเร็จ'));
  });
}
