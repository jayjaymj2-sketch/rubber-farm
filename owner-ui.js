'use strict';
/* Owner-first screens: four daily actions, with optional detailed tools below them. */
function input36(id, label, value = '', type = 'number', attrs = '') {
  return `<div class="field"><label class="fl" for="${id}">${label}</label><input class="inp" id="${id}" type="${type}" value="${esc(value)}" ${type === 'number' ? 'inputmode="decimal" step="any" min="0"' : ''} ${attrs}></div>`;
}
const option36 = (value, label, selected) => `<option value="${esc(value)}"${value === selected ? ' selected' : ''}>${esc(label)}</option>`;
const photoStrip = refs => `<div class="photos">${Farm36.arr(refs).map(ref => `<div class="ph"><img data-ref="${esc(ref)}" alt="รูปแนบ"></div>`).join('')}</div>`;
function bindSave36(ov, fn) {
  $('[data-save]', ov).onclick = async e => { const b = e.currentTarget; b.disabled = true; try { await fn(); } catch (err) { toast(err.message, 'warn'); } finally { if (b.isConnected) b.disabled = false; } };
}
function workerPayment36(id = '') {
  const workers = activeWorkers().filter(w => !id || w.id === id);
  if (!workers.length) return openForm('workers', null, { payType: 'share', ownerPct: 55 });
  const ov = openSheet({ title: 'จ่ายเงินคนกรีด', body: `<div class="field"><label class="fl">คนกรีด</label><select class="inp" id="payWorker36">${workers.map(w => option36(w.id, w.name, id)).join('')}</select></div><div id="payBalance36" class="preview"></div>${input36('payDate36', 'วันที่จ่ายจริง', today(), 'date')}${input36('payAmount36', 'จ่ายครั้งนี้ (บาท)')}<div class="field"><label class="fl">ช่องทาง</label><select class="inp" id="payMethod36"><option>เงินสด</option><option>โอนเงิน/พร้อมเพย์</option></select></div>`, foot: '<button class="btn" data-cancel>ยกเลิก</button><button class="btn pri" data-save>ยืนยันจ่ายเงิน</button>' });
  $('#payWorker36', ov).parentElement.insertAdjacentHTML('beforebegin', `<div class="field"${multiFarm() ? '' : ' hidden'}><label class="fl" for="payFarm36">สวนที่จ่ายเงิน</label><select class="inp" id="payFarm36">${list('farms').map(f => option36(f.id, f.name, defFarm())).join('')}</select></div>`);
  const balanceFor = id => sum(workerLedger(id).rows.filter(x => farmOf(DB[x.coll].get(x.id)) === $('#payFarm36', ov).value), 'amt');
  const update = () => { const id = $('#payWorker36', ov).value, balance = balanceFor(id); $('#payBalance36', ov).textContent = 'ส่วนแบ่ง/ค่าแรงคงค้างของสวนที่เลือก ' + baht(balance); $('#payAmount36', ov).value = Math.max(0, balance); };
  if (typeof attachEvidence37 === 'function') attachEvidence37(ov, 'payment', $('.fields', ov) || $('#payMethod36', ov).parentElement.parentElement, 'สลิปจ่ายคนกรีด');
  $('#payWorker36', ov).onchange = update; $('#payFarm36', ov).onchange = update; update(); $('[data-cancel]', ov).onclick = () => closeSheet(ov, true);
  bindSave36(ov, async () => {
    const amount = num($('#payAmount36', ov).value); if (!(amount > 0)) throw new Error('กรอกจำนวนเงินที่จ่าย');
    if (!Farm36.dateOK($('#payDate36', ov).value)) throw new Error('เลือกวันที่จ่าย');
    const workerId = $('#payWorker36', ov).value;
    if (amount > Math.max(0, balanceFor(workerId)) && !(await confirmBox('ยอดนี้เกินเงินค้าง ส่วนที่เกินจะเป็นเงินจ่ายล่วงหน้า ยืนยันหรือไม่?', 'จ่ายเงิน'))) return;
    await saveRec('payments', { date: $('#payDate36', ov).value, farmId: $('#payFarm36', ov).value, workerId, amount, method: $('#payMethod36', ov).value, type: 'pay', note: 'จ่ายส่วนแบ่งคนกรีด', photos: ov.photoRefs37?.payment || [] }); closeSheet(ov, true); toast('บันทึกจ่ายเงินแล้ว', 'ok'); render();
  });
}
quickSale = function () {
  if (!list('farms').length) return openForm('farms');
  const last = lastSaleDefaults(), farm = defFarm(), workers = activeWorkers().filter(w => w.payType === 'share');
  const ids = (last.workerIds || []).filter(id => workers.some(w => w.id === id)); if (!ids.length && workers.length === 1) ids.push(workers[0].id);
  const product = last.product || 'cuplump';
  const ov = openSheet({ title: 'ขายยาง · พ่อ 55% · คนกรีด 45%', body: `<div class="hint">หักค่ารถก่อนแบ่ง · พ่อ 55% · คนกรีดรวม 45%</div><div class="fields">
    <div class="field half"><label class="fl">วันที่ขาย</label><input class="inp" type="date" id="saleDate36" value="${today()}"></div>
    <div class="field half"><label class="fl">สวน</label><select class="inp" id="saleFarm36">${list('farms').map(f => option36(f.id, f.name, farm)).join('')}</select></div>
    <div class="field"><label class="fl">แปลง</label><select class="inp" id="salePlot36"></select></div>
    <div class="field"><label class="fl">ผู้รับซื้อ</label><input class="inp" id="saleBuyer36" value="${esc(last.buyer || '')}" list="buyers36"><datalist id="buyers36">${[...new Set(list('sales').map(s => s.buyer).filter(Boolean))].map(x => option36(x, x)).join('')}</datalist></div>
    <div class="field"><label class="fl">คนกรีดที่ได้ส่วนแบ่ง</label><div class="row wrap">${workers.map(w => `<label class="worker35"><input type="checkbox" name="saleWorker36" value="${esc(w.id)}"${ids.includes(w.id) ? ' checked' : ''}>${esc(w.name)}</label>`).join('') || '<button class="btn" data-new="workers">เพิ่มชื่อคนกรีด</button>'}</div></div>
    ${input36('saleWeight36', 'น้ำหนักตามใบชั่ง (กก.)')}${input36('salePrice36', 'ราคาต่อกิโลกรัม (บาท)')}${input36('saleTransport36', 'ค่ารถขนยาง (บาท)', 0)}
    <div class="field"><label class="fl">จ่ายค่ารถอย่างไร</label><select class="inp" id="saleTransportMethod36"><option value="separate">พ่อจ่ายค่ารถต่างหาก</option><option value="withheld">ผู้ซื้อหักจากเงินค่ายางแล้ว</option></select></div>
    <div class="field" id="transportPaidWrap36"><label class="fl">ค่ารถที่พ่อจ่ายต่างหาก</label><select class="inp" id="saleTransportPaid36"><option value="yes">จ่ายแล้วในวันที่ขาย</option><option value="no">ยังไม่ได้จ่าย</option></select></div>
    <div class="field"><label class="fl">รับเงินค่ายาง</label><select class="inp" id="saleReceived36"><option value="">เลือกสถานะรับเงิน</option><option value="full">รับครบแล้ว</option><option value="partial">รับบางส่วน</option><option value="none">ยังไม่ได้รับ</option></select></div>
    <div id="receiptFields36">${input36('saleReceipt36', 'รับเงินครั้งนี้ (บาท)')}${input36('saleReceiveDate36', 'วันที่รับเงินจริง', today(), 'date')}</div>
    ${input36('saleDue36', 'วันนัดรับส่วนที่เหลือ (ถ้ามี)', '', 'date')}
    </div><details><summary>ชนิดยาง / DRC / ค่าหักอื่น / ล็อต</summary><div class="fields">
    <div class="field"><label class="fl">ชนิดยาง</label><select class="inp" id="saleProduct36">${Object.entries(PRODUCTS).map(([k, l]) => option36(k, l, product)).join('')}</select></div>
    <div class="field"><label class="fl">วิธีคิดราคา</label><select class="inp" id="saleBasis36">${option36('wet', 'ตามน้ำหนักชั่ง', last.priceBasis || 'wet')}${option36('dry', 'ตามเนื้อยางแห้ง', last.priceBasis || 'wet')}</select></div>
    ${input36('saleDrc36', '%DRC (ตามใบชั่ง หากมี)')}${input36('saleDeduct36', 'ค่าหักอื่น (ไม่รวมค่ารถ)', 0)}
    <div class="field"><label class="fl">ข้อตกลงค่ารถครั้งนี้</label><select class="inp" id="salePayer36">${option36('shared', 'หักค่ารถก่อนแบ่ง 55/45', S().transportPayer || 'shared')}${option36('owner', 'พ่อออกค่ารถจากส่วนของพ่อ', S().transportPayer || 'shared')}</select></div>
    <div class="field"><label class="fl">ตัดยางออกจากล็อตที่เลือก (ถ้ามี)</label><div id="saleLots36"></div><p class="hint">ถ้าไม่เลือกลอต จะบันทึกขายได้ แต่ยังไม่ตัดจากสต็อกล็อต</p></div>
    </div></details><div id="salePreview36" aria-live="polite"></div>`, foot: '<button class="btn" data-cancel>ยกเลิก</button><button class="btn pri" data-save>ตรวจแล้ว · บันทึกขาย</button>' });
  const plotOptions = () => { const f = $('#saleFarm36', ov).value; $('#salePlot36', ov).innerHTML = option36('', 'รวมสวน / ไม่แยกแปลง', '') + list('plots', p => p.farmId === f).map(p => option36(p.id, p.name, last.plotId)).join(''); };
  const lotOptions = () => { const f = $('#saleFarm36', ov).value, product = $('#saleProduct36', ov).value;
    $('#saleLots36', ov).innerHTML = list('rubberlots', r => farmOf(r) === f && r.product === product && Farm36.lot(state36(), r).available > 0).map(r => `<div class="row" style="margin:8px 0"><label class="worker35"><input type="checkbox" data-lot36="${esc(r.id)}">${esc(r.name)} · เหลือ ${fmt(Farm36.lot(state36(), r).available, 2)} กก.</label><input class="inp" style="max-width:100px" aria-label="กิโลกรัมจาก ${esc(r.name)}" data-lotkg36="${esc(r.id)}" type="number" min="0" step="any" inputmode="decimal"></div>`).join('') || '<p class="muted small">ยังไม่มีล็อตชนิดนี้ในสวน</p>';
    $$('[data-lot36]', ov).forEach(x => x.onchange = () => { const kg = $(`[data-lotkg36="${x.dataset.lot36}"]`, ov); if (x.checked && !num(kg.value)) kg.value = num($('#saleWeight36', ov).value); update(); });
    $$('[data-lotkg36]', ov).forEach(x => x.oninput = update);
  };
  const draft = () => ({ date: $('#saleDate36', ov).value, farmId: $('#saleFarm36', ov).value, plotId: $('#salePlot36', ov).value, buyer: $('#saleBuyer36', ov).value.trim(),
    product: $('#saleProduct36', ov).value, weight: num($('#saleWeight36', ov).value), price: num($('#salePrice36', ov).value), drc: $('#saleDrc36', ov).value, priceBasis: $('#saleBasis36', ov).value,
    photos: ov.photoRefs37?.sale || [], split: 'share', workerIds: $$('input[name=saleWorker36]:checked', ov).map(x => x.value), ownerPct: 55, shareMode: 'equal', sharedCost: 0, deduct: num($('#saleDeduct36', ov).value),
    transportCost: num($('#saleTransport36', ov).value), transportPayer: $('#salePayer36', ov).value, transportMethod: $('#saleTransportMethod36', ov).value,
    installments: true, received: false, dueDate: $('#saleDue36', ov).value, lotNo: nextLotNo($('#saleDate36', ov).value),
    lotAllocations: $$('[data-lot36]:checked', ov).map(x => ({ lotId: x.dataset.lot36, kg: num($(`[data-lotkg36="${x.dataset.lot36}"]`, ov).value) })) });
  const update = () => { const d = draft(), c = saleCalc(d), status = $('#saleReceived36', ov).value;
    $('#transportPaidWrap36', ov).hidden = d.transportMethod === 'withheld' || !d.transportCost;
    $('#receiptFields36', ov).hidden = !status || status === 'none'; $('#saleReceipt36', ov).disabled = status === 'full'; if (status === 'full') $('#saleReceipt36', ov).value = c.net;
    const error = saleError35(d); $('#salePreview36', ov).innerHTML = error ? `<p class="hint">${esc(error)}</p>` : SCHEMA.sales.preview(d);
  };
  plotOptions(); lotOptions(); $$('input,select', ov).forEach(x => { if (!x.dataset.lot36 && !x.dataset.lotkg36) x.oninput = update; });
  $('#saleFarm36', ov).onchange = () => { plotOptions(); lotOptions(); update(); };
  $('#saleProduct36', ov).onchange = () => { $('#saleBasis36', ov).value = $('#saleProduct36', ov).value === 'latex' ? 'dry' : 'wet'; $('#salePrice36', ov).value = ''; lotOptions(); update(); };
  $('#saleBasis36', ov).onchange = () => { $('#salePrice36', ov).value = ''; update(); toast('กรอกราคาให้ตรงวิธีคิดที่เลือก', 'warn'); };
  $('[data-cancel]', ov).onclick = () => closeSheet(ov, true);
  bindSave36(ov, async () => {
    const d = draft(), status = $('#saleReceived36', ov).value, error = saleError35(d); if (error) throw new Error(error); if (!status) throw new Error('เลือกสถานะรับเงิน');
    if (!Farm36.dateOK(d.date)) throw new Error('เลือกวันที่ขาย');
    d.id = uid(); const entries = [['sales', d]];
    if (status !== 'none') { const amount = num($('#saleReceipt36', ov).value); if (!(amount > 0)) throw new Error('กรอกจำนวนเงินที่รับ'); entries.push(['settlements', { kind: 'receive', saleId: d.id, farmId: d.farmId, date: $('#saleReceiveDate36', ov).value, amount, method: 'เงินสด', photos: ov.photoRefs37?.receipt || [] }]); }
    if (d.transportCost && d.transportMethod === 'separate' && $('#saleTransportPaid36', ov).value === 'yes') entries.push(['settlements', { kind: 'transport', saleId: d.id, farmId: d.farmId, date: d.date, amount: d.transportCost, method: 'เงินสด' }]);
    await saveBatch36(entries);
    try { await SCHEMA.sales.afterSave?.(get('sales', d.id), true); } catch (_) { toast('ยอดขายเก็บแล้ว แต่ยังอัปเดตราคาประวัติไม่ได้', 'warn'); }
    try { localStorage.setItem('rf_last_sales', JSON.stringify({ product: d.product, buyer: d.buyer, farmId: d.farmId, plotId: d.plotId, workerIds: d.workerIds, split: 'share', ownerPct: 55, priceBasis: d.priceBasis })); } catch (_) { /* The sale is already committed; remembering defaults is optional. */ }
    closeSheet(ov, true); toast('บันทึกขายแล้ว · ส่วนของพ่อ ' + baht(saleCalc(d).ownerAfterTransport), 'ok'); go('ownerSale', d.id);
  }); update(); if (typeof enhanceSale37 === 'function') enhanceSale37(ov, draft, update); $('#saleWeight36', ov).focus();
};
const salesBefore36 = ROUTES.sales;
ROUTES.sales = { title: 'ขายยางและส่วนของพ่อ', render(main) {
  if (!ownerMode36()) return salesBefore36.render(main);
  const st = pstate('ownerSales36', () => ({ mode: 'month', ym: ymOf(today()) })), [from, to] = periodRange(st), rows = list('sales', r => inFarm(r) && r.date >= from && r.date <= to).sort(byDateDesc);
  main.innerHTML = `<button class="btn pri block" id="newOwnerSale36">ขายยาง · พ่อ 55% · คนกรีด 45%</button>${periodNav(st)}<div class="card"><dl class="kv"><dt>ยอดขายก่อนหัก</dt><dd>${baht(sum(rows, r => saleCalc(r).gross))}</dd><dt>คนกรีดรวมได้</dt><dd>${baht(sum(rows, r => saleCalc(r).tapperTotal))}</dd><dt>ส่วนพ่อหลังค่ารถ</dt><dd>${baht(sum(rows, r => saleCalc(r).ownerAfterTransport))}</dd></dl></div>` + rows.map(r => `<div class="card"><h3>${thDate(r.date)} · ${esc(r.buyer || PRODUCTS[r.product])}</h3><p>${fmt(r.weight, 2)} กก. · พ่อหลังค่ารถ ${baht(saleCalc(r).ownerAfterTransport)}</p><p>ค้างรับ ${baht(saleOwed36(r))}</p><button class="btn" data-go="ownerSale/${esc(r.id)}">ดูส่วนแบ่ง / รับเงิน / จ่ายคนกรีด</button></div>`).join('');
  $('#newOwnerSale36', main).onclick = quickSale; bindPeriod(main, st, () => ROUTES.sales.render(main));
} };
async function settlementSheet36(c, record, kind) {
  try {
    if (!Farm36.outstanding(state36(), kind, record)) return toast(kind === 'receive' ? 'รับเงินครบแล้ว' : 'จ่ายครบแล้ว', 'ok');
    const parent = await enableInstallments36(c, record), owed = Farm36.outstanding(state36(), kind, parent);
    if (!owed) return toast(kind === 'receive' ? 'รับเงินครบแล้ว' : 'จ่ายครบแล้ว', 'ok');
    const ov = openSheet({ title: kind === 'receive' ? 'รับเงินค่ายาง' : kind === 'transport' ? 'จ่ายค่ารถ' : 'จ่ายรายจ่าย', body: `<div class="preview">คงค้าง ${baht(owed)}</div>${input36('settleDate36', 'วันที่รับ/จ่ายจริง', today(), 'date')}${input36('settleAmount36', 'จำนวนเงินครั้งนี้ (บาท)', owed)}<div class="field"><label class="fl">ช่องทาง</label><select class="inp" id="settleMethod36"><option>เงินสด</option><option>โอนเงิน</option></select></div>${input36('settleNote36', 'หมายเหตุ', '', 'text')}`, foot: '<button class="btn" data-cancel>ยกเลิก</button><button class="btn pri" data-save>บันทึก</button>' });
    if (typeof attachEvidence37 === 'function') attachEvidence37(ov, 'settlement', $('#settleNote36', ov).parentElement.parentElement, 'หลักฐานรับ/จ่าย');
    $('[data-cancel]', ov).onclick = () => closeSheet(ov, true);
    bindSave36(ov, async () => { await saveRec('settlements', { date: $('#settleDate36', ov).value, amount: num($('#settleAmount36', ov).value), kind, farmId: farmOf(parent), ...(c === 'sales' ? { saleId: parent.id } : { expenseId: parent.id }), method: $('#settleMethod36', ov).value, note: $('#settleNote36', ov).value, photos: ov.photoRefs37?.settlement || [] }); closeSheet(ov, true); toast('บันทึกเงินแล้ว', 'ok'); render(); });
  } catch (e) { toast(e.message, 'warn'); }
}
function allocationSheet36(sale) {
  const lots = list('rubberlots', r => farmOf(r) === farmOf(sale) && r.product === sale.product && r.date <= sale.date), old = Farm36.arr(sale.lotAllocations);
  const ov = openSheet({ title: 'ยางที่ตัดจากล็อตสำหรับครั้งขายนี้', body: `<p>น้ำหนักขาย ${fmt(sale.weight, 2)} กก. น้ำหนักจากล็อตที่เลือกต้องรวมเท่ากัน หากไม่เลือกจะเป็นรายการขายที่ยังไม่ผูกล็อต</p>${lots.map(r => `<div class="field"><label class="worker35"><input type="checkbox" data-picklot36="${esc(r.id)}"${old.some(x => x.lotId === r.id) ? ' checked' : ''}>${esc(r.name)} · ใช้กับครั้งนี้ได้ ${fmt(Farm36.lot(state36(), r, sale.id).available, 2)} กก.</label><input class="inp" aria-label="น้ำหนักจาก ${esc(r.name)}" type="number" step="any" min="0" data-pickkg36="${esc(r.id)}" value="${esc(old.find(x => x.lotId === r.id)?.kg || '')}"></div>`).join('') || '<p class="hint">ยังไม่มีล็อตที่ตรงกับชนิด สวน และวันที่ขายนี้</p>'}`, foot: '<button class="btn" data-cancel>ยกเลิก</button><button class="btn pri" data-save>ยืนยันล็อต</button>' });
  $('[data-cancel]', ov).onclick = () => closeSheet(ov, true);
  bindSave36(ov, async () => { const lotAllocations = $$('[data-picklot36]:checked', ov).map(x => ({ lotId: x.dataset.picklot36, kg: num($(`[data-pickkg36="${x.dataset.picklot36}"]`, ov).value) })); await saveRec('sales', { ...sale, lotAllocations }); closeSheet(ov, true); render(); });
}
ROUTES.ownerSale = { title: 'สรุปการขายและส่วนแบ่ง', render(main, id) {
  const s = get('sales', id); if (!s) { main.innerHTML = emptyBox('ไม่พบรายการขาย', 'coins'); return; }
  const c = saleCalc(s), state = state36(), receipts = Farm36.settlementRows(state, 'receive', s), transport = Farm36.settlementRows(state, 'transport', s);
  main.innerHTML = `<div class="card"><h3>${esc(s.buyer || 'การขายยาง')} · ${thDate(s.date)}</h3><p>${esc(farmName(farmOf(s)))} · ${esc(plotName(s.plotId))} · ${fmt(s.weight, 2)} กก.</p>${SCHEMA.sales.preview(s)}</div><div class="card"><h3>รับเงินจากผู้ซื้อ</h3><dl class="kv"><dt>รับแล้ว</dt><dd>${baht(Farm36.totalSettled(state, 'receive', s))}</dd><dt>ค้างรับ</dt><dd>${baht(Farm36.outstanding(state, 'receive', s))}</dd></dl>${receipts.map(x => `<p class="small">${thDate(x.date)} · ${baht(x.amount)}${x.id.startsWith('legacy:') ? '' : `<button class="link" data-open="settlements:${esc(x.id)}">ดู/แก้</button>`}</p>`).join('')}<button class="btn pri" id="receive36">บันทึกรับเงินเพิ่ม</button></div>
    ${num(s.transportCost) ? `<div class="card"><h3>ค่ารถ</h3><p>${s.transportPayer === 'shared' ? `หักก่อนแบ่ง ${fmt(c.ownerPct)}/${fmt(100 - c.ownerPct)}` : 'เจ้าของรับผิดชอบ'} · ${s.transportMethod === 'withheld' ? 'ผู้ซื้อหักแล้ว ไม่ต้องจ่ายซ้ำ' : 'จ่ายต่างหาก · ค้างจ่าย ' + baht(Farm36.outstanding(state, 'transport', s))}</p>${transport.map(x => `<p class="small">${thDate(x.date)} · ${baht(x.amount)} <button class="link" data-open="settlements:${esc(x.id)}">ดู/แก้</button></p>`).join('')}${s.transportMethod === 'separate' ? '<button class="btn" id="transport36">บันทึกจ่ายค่ารถ</button>' : ''}</div>` : ''}
    <div class="card"><h3>จ่ายคนกรีด</h3><p class="hint">การขายสร้างยอดส่วนแบ่ง การจ่ายคนกรีดต้องบันทึกเมื่อจ่ายจริง ยอดค้างด้านล่างรวมทุกครั้งขายและเงินเบิกล่วงหน้าแล้ว</p>${c.ids.map(id => `<div class="row wrap"><b>${esc(workerName(id))}</b><span class="sp"></span><span>ค้างทั้งหมด ${baht(workerLedger(id).balance)}</span><button class="btn" data-pay36="${esc(id)}">จ่ายเงิน</button></div>`).join('')}</div><button class="btn" data-open="sales:${esc(s.id)}">ดูใบชั่ง / แก้รายละเอียด</button>`;
  $('#receive36', main).onclick = () => settlementSheet36('sales', s, 'receive'); const t = $('#transport36', main); if (t) t.onclick = () => settlementSheet36('sales', s, 'transport');
  $$('[data-pay36]', main).forEach(b => b.onclick = () => workerPayment36(b.dataset.pay36));
  main.insertAdjacentHTML('beforeend', '<button class="btn" id="allocate36">เลือก / แก้ล็อตที่นำมาขาย</button>'); $('#allocate36', main).onclick = () => allocationSheet36(s);
  if (!Farm36.outstanding(state, 'receive', s)) { $('#receive36', main).disabled = true; $('#receive36', main).textContent = 'รับเงินครบแล้ว'; }
  if (t && !Farm36.outstanding(state, 'transport', s)) { t.disabled = true; t.textContent = 'จ่ายค่ารถครบแล้ว'; }
} };
ROUTES.debts = { title: 'เงินค้างรับ / ค้างจ่าย', render(main) {
  const s = state36(), entries = [];
  for (const r of list('sales', inFarm)) { if (Farm36.outstanding(s, 'receive', r)) entries.push(['sales', r, 'receive']); if (r.transportMethod === 'separate' && Farm36.outstanding(s, 'transport', r)) entries.push(['sales', r, 'transport']); }
  for (const r of list('expenses', inFarm)) if (Farm36.outstanding(s, 'expense', r)) entries.push(['expenses', r, 'expense']);
  entries.sort((a, b) => (a[1].dueDate || '9999').localeCompare(b[1].dueDate || '9999'));
  main.innerHTML = `<div class="card"><p>บันทึกตามวันที่ได้เงินหรือจ่ายเงินจริง แบ่งรับ/จ่ายหลายครั้งได้</p></div>` + (entries.length ? entries.map(([c, r, kind], i) => `<div class="card"><h3>${kind === 'receive' ? 'ค่ายางค้างรับ' : kind === 'transport' ? 'ค่ารถค้างจ่าย' : 'รายจ่ายค้างจ่าย'} · ${esc(r.buyer || r.vendor || r.cat || '')}</h3><p>${thDate(r.date)} · ${esc(farmName(farmOf(r)))} · ${baht(Farm36.outstanding(s, kind, r))}</p>${r.dueDate ? `<p class="${r.dueDate < today() ? 'warn' : 'muted'}">ครบกำหนด ${thDate(r.dueDate)}</p>` : ''}<button class="btn pri" data-settle36="${i}">บันทึก${kind === 'receive' ? 'รับ' : 'จ่าย'}เงิน</button><button class="btn" ${c === 'sales' ? `data-go="ownerSale/${esc(r.id)}"` : `data-open="expenses:${esc(r.id)}"`}>ดูรายละเอียด</button></div>`).join('') : emptyBox('ไม่มีเงินค้างในสวนที่เลือก', 'check'));
  $$('[data-settle36]', main).forEach(b => b.onclick = () => { const [c, r, k] = entries[num(b.dataset.settle36)]; settlementSheet36(c, r, k); });
  main.insertAdjacentHTML('beforeend', '<button class="btn" data-go="settlementHistory">ประวัติรับ–จ่ายเป็นงวดทั้งหมด</button>');
} };
ROUTES.settlementHistory = { title: 'ประวัติเงินแต่ละงวด', render(main) { main.innerHTML = list('settlements', inFarm).sort(byDateDesc).map(r => `<div class="card"><b>${r.kind === 'receive' ? 'รับค่ายาง' : r.kind === 'transport' ? 'จ่ายค่ารถ' : 'จ่ายรายจ่าย'} · ${baht(r.amount)}</b><p>${thDate(r.date)} · ${esc(r.method || '')}</p><button class="btn" data-open="settlements:${esc(r.id)}">หลักฐาน / แก้ไข</button></div>`).join('') || emptyBox('ยังไม่มีประวัติเงินเป็นงวด', 'cash'); } };
ROUTES.rubberlots = { title: 'ยางเก็บไว้ / ล็อต', render(main) {
  const state = state36(), lots = list('rubberlots', inFarm).sort(byDateDesc), untracked = list('sales', r => inFarm(r) && !Farm36.arr(r.lotAllocations).length);
  main.innerHTML = `<div class="card"><p>บันทึกยางที่เก็บก่อนขาย แล้วเลือกล็อตตอนขาย ถ้าน้ำหนักลด ให้แก้ยอด “น้ำหนักลด” ในล็อต</p><button class="btn pri" data-new="rubberlots">เพิ่มยางที่เก็บ</button></div>${untracked.length ? `<p class="hint">มี ${untracked.length} รายการขายที่ไม่ได้ผูกล็อต จึงยังเทียบกับล็อตเหล่านี้ไม่ได้</p>` : ''}` + lots.map(r => { const q = Farm36.lot(state, r); return `<div class="card"><h3>${esc(r.name)}</h3><p>${esc(PRODUCTS[r.product])} · ${thDate(r.date)} · ${esc(plotName(r.plotId))}</p><dl class="kv"><dt>เก็บเข้าล็อต</dt><dd>${fmt(r.weight, 2)} กก.</dd><dt>น้ำหนักลด</dt><dd>${fmt(r.lossKg, 2)} กก.</dd><dt>ขายแล้ว</dt><dd>${fmt(q.used, 2)} กก.</dd><dt>เหลือ</dt><dd>${fmt(q.available, 2)} กก.</dd></dl><button class="btn" data-open="rubberlots:${esc(r.id)}">ตรวจ / แก้ล็อต</button></div>`; }).join('');
} };
ROUTES.buyers = { title: 'เทียบผู้รับซื้อ', render(main) {
  const st = pstate('buyers36', () => ({ mode: 'year', year: today().slice(0, 4), ym: ymOf(today()) })); const [from, to] = periodRange(st), groups = Farm36.buyers(state36(), from, to, curFarm);
  main.innerHTML = periodNav(st) + '<div class="card"><p>เทียบประวัติเงินสุทธิหลังค่าหักและค่ารถต่อกิโลกรัมเนื้อยางแห้ง แยกชนิดยาง ใช้เฉพาะรายการที่มี DRC หรือยางแผ่น</p><p class="hint">วันที่ คุณภาพยาง และปริมาณขายอาจต่างกัน ค่านี้เป็นประวัติ ไม่ใช่ราคาที่ร้านเสนอวันนี้</p></div>' + groups.map(g => `<div class="card"><h3>${esc(g.buyer)} · ${esc(PRODUCTS[g.product])}</h3><div class="big">${g.netPerDryKg === null ? 'ยังเทียบฐานแห้งไม่ได้' : fmt(g.netPerDryKg, 2) + ' บาท/กก.แห้ง'}</div><p>${g.count} ครั้ง · ขาย ${fmt(g.kg, 2)} กก. · ส่วนพ่อหลังค่ารถ ${baht(g.owner)}</p><p>ค้างรับ ${baht(g.debt)}</p>${g.unknownDRC ? `<p class="hint">${g.unknownDRC} ครั้งไม่มี DRC ไม่รวมในการคำนวณราคาต่อ กก.แห้ง</p>` : ''}</div>`).join(''); bindPeriod(main, st, () => ROUTES.buyers.render(main));
} };
ROUTES.budgets = { title: 'งบและเป้าหมายรายเดือน', render(main) {
  main.innerHTML = '<div class="card"><button class="btn pri" data-new="budgets">ตั้งงบ / เป้าหมาย</button><p class="hint">งบดูแลสวนรวมรายจ่าย ค่าแรงรายวัน และค่ารถ ส่วนแบ่งคนกรีดแสดงในบัญชีการขาย ไม่รวมในงบนี้</p></div>' + list('budgets', inFarm).sort((a, b) => b.month.localeCompare(a.month)).map(r => {
    const a = budgetActual36(r), prior = shiftYM(r.month, -12), historical = sum(list('sales', x => x.date.slice(0, 7) === prior && farmOf(x) === r.farmId && (!r.plotId || x.plotId === r.plotId) && x.product === r.product), 'weight');
    return `<div class="card"><h3>${thYM(r.month)} · ${esc(plotName(r.plotId) || 'รวมสวน')}</h3><dl class="kv"><dt>งบที่ตั้งไว้</dt><dd>${baht(r.expenseLimit)}</dd><dt>ใช้จริงตามรายการ</dt><dd class="${a.over ? 'neg' : ''}">${baht(a.cost)}</dd><dt>เกินงบ</dt><dd>${baht(a.over)}</dd><dt>ขาย ${esc(PRODUCTS[r.product])}</dt><dd>${fmt(a.kg, 2)} / ${fmt(r.targetKg, 2)} กก.</dd></dl><p class="hint">เดือนเดียวกันปีก่อน: ${historical ? fmt(historical, 2) + ' กก.' : 'ยังไม่มีข้อมูล'}${a.unassigned ? `<br>มี ${a.unassigned} รายการรวมสวนที่ยังไม่ระบุแปลง ไม่รวมในยอดแปลงนี้` : ''}</p><button class="btn" data-open="budgets:${esc(r.id)}">ปรับงบ / เป้าหมาย</button></div>`;
  }).join('');
} };
ROUTES.tasks = { title: 'งานมอบหมาย', render(main) {
  const st = pstate('tasks36', () => ({ done: false })), tasks = list('tasks', r => inFarm(r) && (st.done || r.status !== 'done')).sort((a, b) => a.date.localeCompare(b.date));
  main.innerHTML = `<div class="card"><button class="btn pri" data-new="tasks">มอบหมายงาน</button><label class="switch"><input type="checkbox" id="showDone36"${st.done ? ' checked' : ''}>ดูงานเสร็จแล้วด้วย</label></div>` + tasks.map(r => `<div class="card"><h3>${esc(r.title)}</h3><p>${esc(workerName(r.workerId))} · ${esc(plotName(r.plotId))}</p><p class="${r.date < today() && r.status !== 'done' ? 'warn' : ''}">กำหนด ${thDate(r.date)} · ${{ todo: 'รอทำ', doing: 'กำลังทำ', done: 'เสร็จแล้ว' }[r.status]}</p><p>ตรวจ ${Farm36.arr(r.checklist).length}/${TASK_CHECKS36.length} ข้อ · รูป ${Farm36.arr(r.photos).length} รูป</p><button class="btn" data-open="tasks:${esc(r.id)}">อัปเดตงาน / เพิ่มรูป</button></div>`).join(''); $('#showDone36', main).onchange = e => { st.done = e.target.checked; ROUTES.tasks.render(main); };
} };
ROUTES.healthFollow = { title: 'ติดตามต้นยาง', render(main) {
  const checks = list('healthchecks'), cases = list('health', inFarm).sort(byDateDesc);
  main.innerHTML = '<div class="card"><button class="btn pri" data-new="health">บันทึกต้นยางที่มีปัญหา</button><p class="hint">ทำเครื่องหมายเลขต้นหรือจุดในแปลง แล้วถ่ายรูปจากมุมเดิมในการตรวจครั้งถัดไป</p></div>' + cases.map(h => {
    const history = checks.filter(x => x.healthId === h.id).sort(byDateDesc), last = history[0];
    return `<div class="card"><h3>${esc(h.treeTag || h.issue || 'ปัญหาต้นยาง')} · ${esc(plotName(h.plotId))}</h3><p>${esc(h.issue || '')} · ${esc(h.location || '')}</p>${photoStrip(h.photos)}<button class="btn" data-open="health:${esc(h.id)}">ดูข้อมูลเริ่มต้น</button><button class="btn pri" data-follow36="${esc(h.id)}">บันทึกผลตรวจซ้ำ</button>${last?.nextDate ? `<p class="${last.nextDate < today() ? 'warn' : ''}">ตรวจครั้งถัดไป ${thDate(last.nextDate)}</p>` : ''}${history.map(x => `<div class="follow36"><p><b>${thDate(x.date)} · ${{ better: 'ดีขึ้น', same: 'เหมือนเดิม', worse: 'แย่ลง', recovered: 'ฟื้นตัวแล้ว' }[x.result]}</b></p><p>${esc(x.note || '')}</p>${photoStrip(x.photos)}<button class="link" data-open="healthchecks:${esc(x.id)}">ดู / แก้ผลติดตาม</button></div>`).join('')}</div>`;
  }).join(''); $$('[data-follow36]', main).forEach(b => b.onclick = () => { const h = get('health', b.dataset.follow36); openForm('healthchecks', null, { healthId: h.id, farmId: farmOf(h), plotId: h.plotId }); });
} };
function configureOwner36() {
  const ov = openSheet({ title: 'ตั้งค่าการใช้งานของพ่อ', body: `<p>พ่อเป็นเจ้าของสวน จ้างคนกรีด โดยพ่อ 55% · คนกรีด 45%</p><div class="field"><label class="fl">ข้อตกลงค่ารถเริ่มต้น</label><select class="inp" id="ownerPayer36">${option36('shared', 'หักค่ารถก่อน แล้วแบ่ง 55/45', S().transportPayer || 'shared')}${option36('owner', 'แบ่ง 55/45 แล้วพ่อออกค่ารถเอง', S().transportPayer || 'shared')}</select></div><label class="switch"><input type="checkbox" id="ownerView36"${S().ownerView !== false ? ' checked' : ''}>ใช้หน้าหลักแบบง่ายสำหรับเจ้าของสวน</label>`, foot: '<button class="btn pri" data-save>บันทึก</button>' });
  bindSave36(ov, async () => { await setS({ ownerView: $('#ownerView36', ov).checked, ownerPct: 55, transportPayer: $('#ownerPayer36', ov).value }); closeSheet(ov, true); render(); });
}
const advancedHome36 = ROUTES.home.render;
function ownerStart36(main) {
  main.innerHTML = `<section class="card owner36"><h2>เริ่มใช้งานสวนของพ่อ</h2><p>พ่อเป็นเจ้าของสวน จ้างคนกรีด แบ่งพ่อ 55% คนกรีด 45% โดยหักค่ารถก่อนแบ่ง</p><div class="fields">${input36('startFarm36', 'ชื่อสวน', '', 'text')}${input36('startPlot36', 'ชื่อแปลง (ถ้ามี)', '', 'text')}${input36('startWorker36', 'ชื่อคนกรีด', '', 'text')}</div><button class="btn pri block" id="startSave36">เริ่มใช้งาน</button><p class="hint">เพิ่มคนกรีดและแปลงอื่นภายหลังได้ ข้อมูลเก็บในเครื่องนี้จนกว่าจะเชื่อมระบบกลาง</p><button class="btn" data-go="settings">เชื่อมข้อมูลเดิม / กู้ไฟล์สำรอง</button></section>`;
  $('#startSave36', main).onclick = async e => {
    const farmName = $('#startFarm36', main).value.trim(), workerName = $('#startWorker36', main).value.trim(), plotName = $('#startPlot36', main).value.trim();
    if (!farmName || !workerName) return toast('กรอกชื่อสวนและคนกรีด', 'warn'); const button = e.currentTarget; button.disabled = true;
    try { const farmId = uid(), plotId = plotName ? uid() : '', entries = [['farms', { id: farmId, name: farmName }]];
      if (plotId) entries.push(['plots', { id: plotId, farmId, name: plotName, status: 'tapping' }]);
      entries.push(['workers', { name: workerName, payType: 'share', ownerPct: 55, plotIds: plotId ? [plotId] : [], active: true }]); await saveBatch36(entries); toast('พร้อมบันทึกขายยางแล้ว', 'ok'); render();
    } catch (e) { toast(e.message, 'warn'); button.disabled = false; }
  };
}
ROUTES.home.render = function(main) {
  if (!ownerMode36()) return advancedHome36.call(this, main);
  if (!list('farms').length) return ownerStart36(main);
  const from = ymOf(today()) + '-01', to = lastDay(ymOf(today())), p = pnl(from, to), cash = cashReport35(from, to), sales = list('sales', r => inFarm(r) && r.date >= from && r.date <= to), tasks = list('tasks', r => inFarm(r) && r.status !== 'done');
  const workerIds = [...new Set([...activeWorkers().filter(w => w.payType === 'share' && (curFarm === 'all' || Farm36.arr(w.plotIds).some(id => get('plots', id)?.farmId === curFarm))).map(w => w.id), ...list('sales', inFarm).flatMap(r => r.workerIds || [])])];
  main.innerHTML = `<section class="card owner36"><h2>สวนของพ่อ</h2><p>เจ้าของสวน · จ้างคนกรีด · พ่อ 55% · คนกรีด 45%</p><div class="hint">${S().transportPayer === 'owner' ? 'แบ่งก่อน แล้วพ่อจ่ายค่ารถจากส่วนของพ่อ' : 'หักค่ารถก่อน แล้วแบ่งพ่อ 55% / คนกรีดรวม 45%'}</div><div class="actions36"><button class="btn pri" id="ownerSale36">${ic('coins')}ขายยาง</button><button class="btn" id="ownerPay36">${ic('wallet')}จ่ายคนกรีด</button><button class="btn" id="ownerExpense36">${ic('receipt')}บันทึกค่าใช้จ่าย</button><button class="btn" data-go="debts">${ic('cash')}เงินค้างรับ / จ่าย</button></div></section>
    <section class="card"><h3>เดือน ${thYM(ymOf(today()))}</h3><div class="grid2">${kpi('ส่วนพ่อหลังค่ารถ', baht(sum(sales, r => saleCalc(r).ownerAfterTransport)), 'จากยอดขาย ยังไม่หักค่าดูแลอื่น', 'coins')}${kpi('เหลือหลังค่าใช้จ่ายสวน', baht(p.profit), 'ตามรายการ ไม่ใช่เงินสด', 'chart')}${kpi('ค่ายางค้างรับสะสม', baht(cash.receivable), 'รวมเงินส่วนคนกรีดด้วย', 'cash')}${kpi('ส่วนแบ่ง/ค่าแรงค้างจ่าย', baht(cash.workerOwed), 'สะสมถึงสิ้นเดือนนี้', 'wallet')}</div><button class="btn" data-go="cash">ดูเงินรับ–จ่ายจริง</button></section>
    <section class="card"><h3>คนกรีด</h3>${workerIds.map(id => `<div class="row wrap"><b>${esc(workerName(id))}</b><span class="sp"></span><span>ค้าง ${baht(workerLedger(id).balance)}</span><button class="btn sm" data-workerpay36="${esc(id)}">จ่ายเงิน</button></div>`).join('') || '<p class="muted">เพิ่มชื่อคนกรีดก่อนบันทึกขายครั้งแรก</p>'}<button class="btn" data-new="workers" data-preset='{"payType":"share","ownerPct":55}'>เพิ่มคนกรีด</button></section>
    <section class="card"><h3>รายการขายล่าสุด</h3>${list('sales', inFarm).sort(byDateDesc).slice(0, 4).map(r => `<button class="owner-sale-row36" data-go="ownerSale/${esc(r.id)}"><span>${thDate(r.date)} · ${esc(r.buyer || PRODUCTS[r.product])}</span><b>พ่อ ${baht(saleCalc(r).ownerAfterTransport)}</b></button>`).join('') || '<p class="muted">ยังไม่มีรายการขาย</p>'}</section>
    <section class="card"><h3>งานรอทำ ${tasks.length} งาน</h3>${tasks.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3).map(r => `<p class="${r.date < today() ? 'warn' : ''}">${esc(r.title)} · ${esc(workerName(r.workerId))} · ${thDate(r.date)}</p>`).join('')}<button class="btn" data-go="tasks">ดู / มอบหมายงาน</button></section>
    <details class="card"><summary>เครื่องมือดูแลสวนเพิ่มเติม</summary><div class="actions36">${[['rubberlots', 'ยางเก็บไว้'], ['buyers', 'เทียบผู้รับซื้อ'], ['budgets', 'งบ / เป้าหมาย'], ['healthFollow', 'ติดตามต้นยาง'], ['closing', 'ปิดยอดเดือน'], ['team36', 'สิทธิ์ทีมงาน'], ['audit36', 'ประวัติทีม'], ['menu', 'เมนูทั้งหมด']].map(([r, l]) => `<button class="btn" data-go="${r}">${l}</button>`).join('')}</div><button class="link" id="ownerConfig36">ตั้งค่าหน้าของพ่อ</button></details><section class="card" id="dataStatus35" aria-live="polite">${dataStatusHtml35()}</section>`;
  $('#ownerSale36', main).onclick = quickSale; $('#ownerPay36', main).onclick = () => workerPayment36(); $('#ownerExpense36', main).onclick = () => openForm('expenses', null, { paid: true, paidDate: today() }); $('#ownerConfig36', main).onclick = configureOwner36;
  $$('[data-workerpay36]', main).forEach(b => b.onclick = () => workerPayment36(b.dataset.workerpay36));
  const tapNav = $('[data-nav="tapping"]'); if (tapNav) { tapNav.innerHTML = ic('wallet') + '<span>คนกรีด</span>'; tapNav.onclick = () => go('workers'); }
  const add = $('[data-nav="__add"]'); if (add) add.onclick = quickSale;
};
const fullMenu36 = ROUTES.menu.render;
ROUTES.menu.render = function(main) { fullMenu36.call(this, main); main.insertAdjacentHTML('afterbegin', `<div class="card"><h3>ดูแลสวนของพ่อ</h3><div class="actions36">${[['debts', 'เงินค้าง'], ['rubberlots', 'ยางเป็นล็อต'], ['buyers', 'ผู้รับซื้อ'], ['budgets', 'งบ / เป้าหมาย'], ['tasks', 'มอบหมายงาน'], ['healthFollow', 'ติดตามต้นยาง'], ['team36', 'สิทธิ์ทีม'], ['audit36', 'ประวัติทีม']].map(([r, l]) => `<button class="btn" data-go="${r}">${l}</button>`).join('')}</div></div>`); };
const settingsBefore36 = ROUTES.settings.render;
ROUTES.settings.render = function(main) { settingsBefore36.call(this, main); if (role() === 'owner') { main.insertAdjacentHTML('afterbegin', '<div class="card"><h3>เจ้าของสวน · พ่อ 55% · คนกรีด 45%</h3><button class="btn pri" id="ownerSetup36">ตั้งค่าหน้าของพ่อและค่ารถ</button><button class="btn" data-go="team36">กำหนดสิทธิ์ทีมงาน</button></div>'); $('#ownerSetup36', main).onclick = configureOwner36; } };
ROUTES.audit36 = { title: 'ประวัติการเปลี่ยนข้อมูลของทีม', render(main) {
  const rows = list('auditlog', inFarm).sort((a, b) => num(b.at) - num(a.at)).slice(0, 100);
  main.innerHTML = '<div class="card"><p>ประวัติจากระบบกลาง แสดงผู้แก้ไข รายการ และเหตุผลหลังระบบยืนยันรับข้อมูลแล้ว ดูประวัติในเครื่องได้ที่หน้าสำรองข้อมูล</p></div>' + (rows.map(r => `<div class="card"><b>${esc(r.actor)} · ${esc(r.action)}</b><p>${new Date(num(r.at)).toLocaleString('th-TH')} · ${esc(SCHEMA[r.coll]?.title || r.coll)}</p><p>${esc(r.label || r.recId)}</p><p>${esc(r.reason || '')}</p></div>`).join('') || emptyBox('ยังไม่มีประวัติจากระบบกลาง', 'shieldck'));
} };
ROUTES.team36 = { title: 'สิทธิ์ทีมงาน', async render(main) {
  if (role() !== 'owner') { main.innerHTML = emptyBox('เจ้าของเป็นผู้กำหนดสิทธิ์', 'shieldck'); return; }
  if (!S().scriptUrl) { main.innerHTML = '<div class="card"><p>เชื่อม Google Sheets ก่อนเพิ่มบัญชีทีมงาน สิทธิ์จะตรวจจากระบบกลางทุกครั้งที่ส่งหรือรับข้อมูล</p><button class="btn" data-go="settings">ตั้งค่าการเชื่อมต่อ</button></div>'; return; }
  main.innerHTML = '<div class="card">กำลังโหลดทีมงาน…</div>';
  try { const { users } = await api('users.list'); if (route.name !== 'team36') return;
    main.innerHTML = '<div class="card"><button class="btn pri" id="addTeam36">เพิ่มผู้ช่วย</button><p class="hint">คนกรีดที่ต้องการดูเฉพาะยอดตัวเอง ใช้ลิงก์ส่วนตัวจากหน้าคนงาน ผู้ช่วยบันทึกงานกำหนดสิทธิ์ในหน้านี้</p></div>' + users.filter(u => u.role !== 'worker').map(u => `<div class="card"><h3>${esc(u.name)}</h3><p>${u.role === 'editor' ? 'บันทึกได้' : u.role === 'viewer' ? 'ดูอย่างเดียว' : 'เจ้าของ'} · ${u.active === false ? 'ปิดใช้งาน' : 'ใช้งานอยู่'}</p><p>${Farm36.arr(u.plotIds).length ? 'แปลง: ' + Farm36.arr(u.plotIds).map(plotName).join(', ') : Farm36.arr(u.farmIds).length ? 'สวน: ' + Farm36.arr(u.farmIds).map(farmName).join(', ') : 'ทุกสวน'}</p><button class="btn" data-team36="${esc(u.id)}">ปรับสิทธิ์</button><button class="btn" data-key36="${esc(u.id)}">คัดลอกลิงก์ส่วนตัว</button></div>`).join('');
    $('#addTeam36', main).onclick = () => teamSheet36({ name: '', role: 'editor', active: true, readColls: ['farms', 'plots', 'workers', 'tapping', 'rubberlots', 'tasks', 'health', 'healthchecks'], writeColls: ['tapping', 'rubberlots', 'tasks', 'health', 'healthchecks'] });
    $$('[data-team36]', main).forEach(b => b.onclick = () => teamSheet36(users.find(u => u.id === b.dataset.team36)));
    $$('[data-key36]', main).forEach(b => b.onclick = () => copyText(setupLinkFor(users.find(u => u.id === b.dataset.key36).key)));
  } catch (e) { main.innerHTML = `<div class="alert">${esc(e.message)}</div>`; }
} };
function teamSheet36(u) {
  const colls = COLLS.filter(c => c !== 'closings'), ov = openSheet({ title: 'กำหนดสิทธิ์ผู้ช่วย', body: `${input36('teamName36', 'ชื่อผู้ช่วย', u.name, 'text')}<div class="field"><label class="fl">หน้าที่</label><select class="inp" id="teamRole36">${option36('editor', 'ช่วยบันทึก', u.role)}${option36('viewer', 'ดูอย่างเดียว', u.role)}${option36('owner', 'เจ้าของ · ทุกสิทธิ์', u.role)}</select></div><label class="switch"><input type="checkbox" id="teamActive36"${u.active !== false ? ' checked' : ''}>เปิดใช้งาน</label>
    <details open><summary>สวนที่ดูแล (ไม่เลือก = ทุกสวน)</summary>${list('farms').map(f => `<label class="worker35"><input type="checkbox" name="teamFarm36" value="${esc(f.id)}"${Farm36.arr(u.farmIds).includes(f.id) ? ' checked' : ''}>${esc(f.name)}</label>`).join('')}</details>
    <details><summary>แปลงที่ดูแล (ไม่เลือก = ทุกแปลงในสวนที่เลือก)</summary>${list('plots').map(p => `<label class="worker35"><input type="checkbox" name="teamPlot36" value="${esc(p.id)}"${Farm36.arr(u.plotIds).includes(p.id) ? ' checked' : ''}>${esc(p.name)} · ${esc(farmName(p.farmId))}</label>`).join('')}</details>
    <details open><summary>หมวดข้อมูลที่ดู / แก้ไขได้</summary>${colls.map(c => `<div class="row wrap"><span class="sp">${esc(SCHEMA[c]?.title || c)}</span><label class="worker35"><input type="checkbox" data-read36="${c}"${u.readColls === undefined || Farm36.arr(u.readColls).includes(c) ? ' checked' : ''}>ดู</label>${c !== 'auditlog' ? `<label class="worker35"><input type="checkbox" data-write36="${c}"${u.writeColls === undefined || Farm36.arr(u.writeColls).includes(c) ? ' checked' : ''}>แก้ไข</label>` : ''}</div>`).join('')}</details><p class="hint">สิทธิ์ระดับแปลงจะไม่แสดงรายการรวมสวนที่ยังไม่ระบุแปลง สิทธิ์เจ้าของเข้าถึงทุกข้อมูล</p>`, foot: '<button class="btn" data-cancel>ยกเลิก</button><button class="btn pri" data-save>บันทึกสิทธิ์</button>' });
  $('[data-cancel]', ov).onclick = () => closeSheet(ov, true);
  bindSave36(ov, async () => { const readColls = $$('[data-read36]:checked', ov).map(x => x.dataset.read36), writeColls = $$('[data-write36]:checked', ov).map(x => x.dataset.write36); if (writeColls.some(c => !readColls.includes(c))) throw new Error('หมวดที่แก้ไขได้ต้องเปิดสิทธิ์ดูด้วย');
    const name = $('#teamName36', ov).value.trim(); if (!name) throw new Error('กรอกชื่อผู้ช่วย'); await api('users.save', { user: { ...u, name, role: $('#teamRole36', ov).value, active: $('#teamActive36', ov).checked, farmIds: $$('input[name=teamFarm36]:checked', ov).map(x => x.value), plotIds: $$('input[name=teamPlot36]:checked', ov).map(x => x.value), readColls, writeColls } }); closeSheet(ov, true); toast('บันทึกสิทธิ์แล้ว', 'ok'); render();
  });
}
const style36 = document.createElement('style');
style36.textContent = '.owner36 h2{margin:0 0 8px}.actions36{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:16px 0}.actions36 .btn{min-height:68px;font-size:18px;white-space:normal;line-height:1.4}.owner-sale-row36{display:flex;justify-content:space-between;gap:12px;text-align:left;padding:16px 4px;width:100%;border:0;border-bottom:1px solid var(--line);background:transparent;color:var(--text);font:inherit}.follow36{border-left:3px solid var(--line);padding:4px 12px;margin-top:12px}details>summary{cursor:pointer;padding:10px 0;font-weight:600}.overlay .field .inp{min-height:48px}.overlay label.worker35{min-height:48px}.owner36~.card .hint{font-size:14px}@media(max-width:380px){.actions36 .btn{font-size:16px}.owner-sale-row36{flex-direction:column}}'; document.head.appendChild(style36);
style36.textContent += '.link{font:inherit;text-decoration:underline;min-height:44px;border:0;background:transparent;color:var(--pri);cursor:pointer;padding:6px 10px}';
style36.textContent += 'body.owner-mode36 #main .kpi .l{font-size:14px;font-weight:600;line-height:1.5;color:var(--ink2)}body.owner-mode36 #main .kpi .s{font-size:13px;white-space:normal;overflow:visible;line-height:1.5;color:var(--ink2)}body.owner-mode36 #main .kpi .v{font-size:24px;white-space:normal;overflow-wrap:anywhere;overflow:visible}.owner-sale-row36{color:var(--ink)}';
const openSheetBefore36 = openSheet;
openSheet = function(options) {
  const ov = openSheetBefore36(options);
  $$('.field', ov).forEach(f => { const label = $('label.fl', f), input = $('input[id],select[id],textarea[id]', f); if (label && input && !label.htmlFor) label.htmlFor = input.id; }); return ov;
};
const renderBefore36 = render;
render = function() {
  document.body.classList.toggle('owner-mode36', ownerMode36());
  renderBefore36(); const tap = $('[data-nav="tapping"]'), add = $('[data-nav="__add"]');
  if (tap) { tap.innerHTML = ic(ownerMode36() ? 'users' : 'drop') + `<span>${ownerMode36() ? 'คนกรีด' : 'กรีดยาง'}</span>`; tap.onclick = () => go(ownerMode36() ? 'workers' : 'tapping'); }
  if (add) add.onclick = () => ownerMode36() ? quickSale() : quickAdd();
};
