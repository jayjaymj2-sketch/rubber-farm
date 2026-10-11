'use strict';
/* Daily owner flows: staged entry, evidence, readable cash, and honest payment allocation. */
if (!PHOTO_COLLS.includes('payments')) PHOTO_COLLS.push('payments');
SCHEMA.payments.fields.push(field36('photos', 'สลิปจ่ายคนกรีด', 'photos', { max: 3 }));
SCHEMA.settlements.fields.find(f => f.k === 'photos').max = 3;
const allocationNote37 = 'จัดสรรเงินจ่าย เงินเบิก และหักกลบให้ส่วนแบ่ง/ค่าแรงของสวนเดียวกันตามรายการเก่าก่อน ยอดนี้ไม่ใช่หลักฐานว่าโอนแยกสำหรับครั้งขายนี้';
function attachEvidence37(ov, key, parent, label) {
  ov.photoRefs37 ||= {}; ov.photoRefs37[key] ||= [];
  const box = document.createElement('details'); box.className = 'evidence37';
  box.innerHTML = `<summary>${esc(label)} (ถ้ามี)</summary><label class="btn block">ถ่ายรูป / เลือกรูป<input type="file" accept="image/*" capture="environment" data-camera37 hidden></label><label class="btn block">เลือกรูปจากเครื่อง<input type="file" accept="image/*" data-file37 hidden></label><div class="photos" data-photos37></div><p class="hint" data-photo-status37>แนบได้ 3 รูป เก็บในเครื่องก่อนส่งข้อมูล</p>`;
  parent.appendChild(box);
  const draw = () => {
    $('[data-photos37]', box).innerHTML = ov.photoRefs37[key].map((ref, i) => `<div class="ph"><img data-ref="${esc(ref)}" alt="หลักฐาน ${i + 1}"><button class="ph-x" type="button" data-remove37="${i}" aria-label="ลบรูปที่ ${i + 1}">×</button></div>`).join('');
    $$('[data-remove37]', box).forEach(b => b.onclick = () => { ov.photoRefs37[key].splice(num(b.dataset.remove37), 1); draw(); }); hydratePhotos(box);
  };
  box.drawEvidence37 = draw;
  $$('input[type=file]', box).forEach(input => input.onchange = async () => {
    const file = input.files[0]; if (!file) return;
    if (ov.photoRefs37[key].length >= 3) { toast('แนบได้ไม่เกิน 3 รูป', 'warn'); input.value = ''; return; }
    if (!/^image\//.test(file.type) || file.size > 20 * 1024 * 1024) { toast('เลือกรูปภาพขนาดไม่เกิน 20 MB', 'warn'); input.value = ''; return; }
    ov.evidenceBusy37 = num(ov.evidenceBusy37) + 1; $('[data-photo-status37]', box).textContent = 'กำลังเก็บรูป กรุณารอสักครู่';
    $$('[data-save],[data-next37],input[type=file]', ov).forEach(b => b.disabled = true);
    try { const ref = await addLocalPhoto(await compressImage(file, 700000, 1600)); ov.photoRefs37[key].push(ref); draw(); if (box.onPhotoAdded40) await box.onPhotoAdded40(ref); }
    catch (error) { toast('เก็บรูปไม่สำเร็จ: ' + error.message, 'warn'); }
    finally { input.value = ''; ov.evidenceBusy37--; $$('[data-save],[data-next37],input[type=file]', ov).forEach(b => b.disabled = !!ov.evidenceBusy37); $('[data-photo-status37]', box).textContent = `แนบแล้ว ${ov.photoRefs37[key].length}/3 รูป · เก็บในเครื่อง`; }
  });
  return box;
}
const bindSaveBefore37 = bindSave36;
bindSave36 = function(ov, fn) { bindSaveBefore37(ov, async () => { if (ov.evidenceBusy37) throw new Error('รอเก็บรูปให้เสร็จก่อนบันทึก'); await fn(); }); };

function enhanceSale37(ov, draft, update) {
  const body = $('#saleDate36', ov).closest('.sheet-b'), fields = $('#saleDate36', ov).closest('.fields');
  const host = body || fields.parentElement, advanced = $('#saleProduct36', ov).closest('details');
  const progress = document.createElement('div'); progress.className = 'sale-progress37'; progress.setAttribute('aria-live', 'polite');
  fields.before(progress);
  const steps = [1, 2, 3].map(n => { const el = document.createElement('section'); el.className = 'sale-step37'; el.dataset.step = n; host.appendChild(el); return el; });
  const a = document.createElement('div'), b = document.createElement('div'); a.className = b.className = 'fields'; steps[0].appendChild(a); steps[1].appendChild(b);
  ['saleDate36', 'saleFarm36', 'salePlot36', 'saleBuyer36', 'saleWeight36', 'salePrice36'].forEach(id => a.appendChild($('#' + id, ov).closest('.field')));
  const workerField = ($('input[name=saleWorker36]', ov) || $('[data-new="workers"]', ov))?.closest('.field'); if (workerField) a.appendChild(workerField);
  const payer = $('#salePayer36', ov).closest('.field');
  ['saleTransport36', 'saleTransportMethod36', 'saleTransportPaid36', 'saleReceived36'].forEach(id => b.appendChild($('#' + id, ov).closest('.field')));
  b.appendChild($('#receiptFields36', ov)); b.appendChild($('#saleDue36', ov).closest('.field')); b.appendChild(payer);
  steps[0].appendChild(advanced); advanced.querySelector('summary').textContent = 'ชนิดยาง / วิธีคิดราคา / DRC / ค่าหักอื่น / ล็อต';
  const scaleEvidence = attachEvidence37(ov, 'sale', steps[0], 'ถ่ายใบชั่ง / อ่านน้ำหนักและราคา');
  scaleEvidence.open = true; steps[0].prepend(scaleEvidence);
  if (typeof attachScaleReader40 === 'function') attachScaleReader40(ov, scaleEvidence, update);
  const extra = document.createElement('details'); extra.innerHTML = '<summary>สวน / แปลง / ผู้รับซื้อ (ถ้ามี)</summary><div class="fields"></div>';
  a.appendChild(extra);
  ['saleFarm36', 'salePlot36', 'saleBuyer36'].forEach(id => { const f = $('#' + id, ov).closest('.field'); if (id === 'saleFarm36' && list('farms').length === 1) f.hidden = true; $('div', extra).appendChild(f); });
  if (workersCount40(ov) === 1 && workerField) workerField.hidden = true;
  const receiptEvidence = attachEvidence37(ov, 'receipt', steps[1], 'สลิปรับเงินค่ายาง');
  steps[2].appendChild($('#salePreview36', ov));
  const recap = document.createElement('div'); recap.className = 'card'; steps[2].prepend(recap);
  const duplicateBox = document.createElement('div'); steps[2].appendChild(duplicateBox); fields.remove();
  const save = $('[data-save]', ov), foot = save.parentElement;
  const previous = document.createElement('button'), next = document.createElement('button'); previous.className = 'btn'; next.className = 'btn pri'; previous.textContent = 'ย้อนกลับ'; next.textContent = 'ถัดไป'; next.dataset.next37 = '';
  foot.insertBefore(previous, save); foot.insertBefore(next, save);
  const errorBox = document.createElement('p'); errorBox.className = 'warn'; errorBox.setAttribute('role', 'alert'); progress.after(errorBox);
  let step = 0;
  const show = () => {
    steps.forEach((el, i) => el.hidden = i !== step); previous.hidden = step === 0; next.hidden = step === 2; save.hidden = step !== 2;
    progress.textContent = `ขั้น ${step + 1}/3 · ${['น้ำหนักและราคา', 'ค่ารถและรับเงิน', 'ตรวจส่วนแบ่งก่อนบันทึก'][step]}`;
    receiptEvidence.hidden = !$('#saleReceived36', ov).value || $('#saleReceived36', ov).value === 'none';
    if (step === 2) {
      const d = draft(), status = $('#saleReceived36', ov).value, received = status === 'none' ? 0 : num($('#saleReceipt36', ov).value);
      recap.innerHTML = `<h3>ตรวจข้อมูลครั้งนี้</h3><p>${thDate(d.date)} · ${esc(d.buyer || 'ไม่ระบุผู้รับซื้อ')}<br>${esc(farmName(d.farmId))} · ${esc(plotName(d.plotId) || 'รวมสวน')}<br>คนกรีด: ${esc(names(d.workerIds))}</p><dl class="kv"><dt>รับเงินครั้งนี้</dt><dd>${baht(received)}</dd><dt>ค่ายางค้างรับหลังบันทึก</dt><dd>${baht(saleCalc(d).net - received)}</dd></dl>${status !== 'none' ? `<p>รับเงินจริง ${thDate($('#saleReceiveDate36', ov).value)}</p>` : '<p>ยังไม่ได้รับเงินค่ายาง</p>'}${d.dueDate ? `<p>นัดรับเงิน ${thDate(d.dueDate)}</p>` : ''}<p>ค่ารถ: ${d.transportMethod === 'withheld' ? 'ผู้ซื้อหักแล้ว' : $('#saleTransportPaid36', ov).value === 'yes' ? 'เจ้าของสวนจ่ายแล้ว' : 'เจ้าของสวนยังไม่ได้จ่าย'} · ใบชั่ง ${d.photos.length} รูป · หลักฐานรับเงิน ${status === 'none' ? 0 : (ov.photoRefs37.receipt || []).length} รูป</p>`;
      const matches = Farm36.similarSales(state36(), d); duplicateBox.innerHTML = matches.length ? `<div class="alert"><div>พบรายการที่อาจซ้ำ ${matches.length} รายการ ระบบจะให้ตรวจอีกครั้งก่อนบันทึก</div></div>` : '';
    }
  };
  const check = () => {
    if (!Farm36.dateOK(draft().date)) return 'เลือกวันที่ขาย';
    const error = saleError35(draft()); if (error) return error;
    if (step === 1) {
      const status = $('#saleReceived36', ov).value, amount = num($('#saleReceipt36', ov).value), c = saleCalc(draft());
      if (!status) return 'เลือกว่ารับเงินครบ รับบางส่วน หรือยังไม่รับ';
      if (status !== 'none' && (!(amount > 0) || amount > c.net || !Farm36.dateOK($('#saleReceiveDate36', ov).value) || $('#saleReceiveDate36', ov).value < draft().date)) return 'ตรวจจำนวนเงินและวันรับเงินจริง';
      if (status === 'partial' && amount >= c.net) return 'รับบางส่วนต้องน้อยกว่ายอดเต็ม หรือเลือก “รับครบแล้ว”';
      if (draft().dueDate && (!Farm36.dateOK(draft().dueDate) || draft().dueDate < draft().date)) return 'วันนัดรับเงินต้องไม่ก่อนวันที่ขาย';
    }
    return '';
  };
  next.onclick = () => { if (ov.evidenceBusy37) return; const error = check(); errorBox.textContent = error; if (error) { if (error.includes('DRC') || error.includes('ล็อต')) advanced.open = true; return; } step++; update(); show(); $('input:not([disabled]),select', steps[step])?.focus(); };
  previous.onclick = () => { step--; errorBox.textContent = ''; show(); };
  $('#saleReceived36', ov).addEventListener('change', show); show();
}

function saleSlipHtml37(s, compact = false) {
  const c = saleCalc(s), state = state36(), allocations = Farm36.workerAllocation(state, today(), farmOf(s))[s.id];
  return `<article class="sale-slip37"><h2>ใบสรุปการขายและส่วนแบ่ง</h2><p>${esc(farmName(farmOf(s)))} · ${esc(s.lotNo || s.id)}<br>${thDate(s.date)} · ${esc(s.buyer || 'ไม่ระบุผู้รับซื้อ')}</p><p>${esc(PRODUCTS[s.product] || s.product)} · ${fmt(s.weight, 2)} กก. × ${fmt(s.price, 2)} บาท · ${s.priceBasis === 'dry' ? 'คิดตามเนื้อยางแห้ง DRC ' + fmt(s.drc) + '%' : 'คิดตามน้ำหนักชั่ง'}</p><dl class="kv"><dt>ยอดขายก่อนหัก</dt><dd>${baht(c.gross)}</dd><dt>ค่าหักอื่น</dt><dd>${baht(s.deduct)}</dd><dt>ค่ารถ</dt><dd>${baht(s.transportCost)}</dd><dt>ส่วนเจ้าของสวน ${fmt(c.ownerPct)}% หลังค่ารถ</dt><dd>${baht(c.ownerAfterTransport)}</dd><dt>ส่วนคนกรีดรวม ${fmt(100 - c.ownerPct)}%</dt><dd>${baht(c.tapperTotal)}</dd><dt>รับค่ายางแล้ว</dt><dd>${baht(Farm36.totalSettled(state, 'receive', s, today()))}</dd><dt>ค่ายางค้างรับ</dt><dd>${baht(Farm36.outstanding(state, 'receive', s, today()))}</dd></dl><p>${s.transportPayer === 'shared' ? 'หักค่ารถก่อนแบ่งตามสัดส่วน' : 'เจ้าของสวนออกค่ารถจากส่วนของเจ้าของสวน'} · ${s.transportMethod === 'withheld' ? 'ผู้ซื้อหักค่ารถแล้ว' : 'จ่ายค่ารถต่างหาก'}</p>${c.ids.map(id => { const x = allocations?.workers[id] || { settled: 0, remaining: c.per[id] }; return `<div class="card"><b>${esc(workerName(id))}</b><dl class="kv"><dt>ส่วนแบ่งครั้งนี้</dt><dd>${baht(c.per[id])}</dd><dt>จ่าย/หักกลบที่จัดสรร</dt><dd>${baht(x.settled)}</dd><dt>คงค้างตามลำดับรายการ</dt><dd>${baht(x.remaining)}</dd></dl></div>`; }).join('')}<p class="hint">${allocationNote37}</p>${compact ? '' : `<h3>หลักฐานใบชั่ง</h3>${photoStrip(s.photos)}<h3>ประวัติรับค่ายาง</h3>${Farm36.settlementRows(state, 'receive', s, today()).map(x => `<p>${thDate(x.date)} · ${baht(x.amount)}</p>${photoStrip(x.photos)}`).join('') || '<p>ยังไม่มีการรับเงิน</p>'}`}</article>`;
}
async function approveDuplicates37(entries) {
  const state = state36(), candidates = [];
  for (const [coll, record] of entries) {
    if (coll !== 'sales' || Farm36.yes(record.deleted) || get('sales', record.id) || Farm36.error(state, coll, record)) continue;
    for (const match of Farm36.similarSales(state, record)) candidates.push(match);
    state.sales[record.id || uid()] = record;
  }
  if (!candidates.length) return;
  const approved = await new Promise(resolve => {
    const ov = openSheet({ title: 'ตรวจรายการที่อาจบันทึกซ้ำ', body: `<p>วันที่ ผู้รับซื้อ น้ำหนัก และยอดขายตรงกับรายการเดิม ตรวจให้แน่ใจก่อนบันทึกอีกครั้ง</p>${candidates.map(s => `<div class="card">${thDate(s.date)} · ${esc(s.buyer || '')} · ${fmt(s.weight, 2)} กก. · ${baht(saleCalc(s).gross)}<button class="btn" data-review37="${esc(s.id)}">ดูใบสรุปรายการเดิม</button></div>`).join('')}`, foot: '<button class="btn" data-stop37>กลับไปตรวจ / ยกเลิก</button><button class="btn pri" data-proceed37>เป็นการขายอีกครั้งจริง · บันทึกเพิ่ม</button>', onClose: () => resolve(false) });
    $$('[data-review37]', ov).forEach(b => b.onclick = () => openSheet({ title: 'รายการเดิม (ดูอย่างเดียว)', body: saleSlipHtml37(candidates.find(s => s.id === b.dataset.review37), true) }));
    $('[data-stop37]', ov).onclick = () => { resolve(false); closeSheet(ov, true); };
    $('[data-proceed37]', ov).onclick = () => { resolve(true); closeSheet(ov, true); };
  });
  if (!approved) throw new Error('ยังไม่บันทึกเพิ่ม กรุณาตรวจรายการเดิม');
  entries.filter(([coll]) => coll === 'sales').forEach(([, r]) => { r.duplicateApproved = true; });
}
const saveRecBefore37 = saveRec, saveBatchBefore37 = saveBatch36;
saveRec = async function(coll, record, options) { await approveDuplicates37([[coll, record]]); return saveRecBefore37(coll, record, options); };
saveBatch36 = async function(entries) { await approveDuplicates37(entries); return saveBatchBefore37(entries); };

const ownerSaleBefore37 = ROUTES.ownerSale.render;
ROUTES.ownerSale.render = function(main, id) {
  ownerSaleBefore37.call(this, main, id); const s = get('sales', id); if (!s) return;
  main.insertAdjacentHTML('afterbegin', `<div class="card"><button class="btn pri block" data-go="saleSlip37/${esc(id)}">ใบสรุปส่วนแบ่ง / รูป / PDF</button>${photoStrip(s.photos)}<p class="hint">รูปใบชั่งและหลักฐานรับเงินอยู่ในใบสรุป</p></div>`); hydratePhotos(main);
};
ROUTES.saleSlip37 = { title: 'ใบสรุปส่วนแบ่ง', render(main, id) {
  const s = get('sales', id); if (!s) { main.innerHTML = emptyBox('ไม่พบรายการขาย', 'coins'); return; }
  main.innerHTML = `<div class="card no-print"><button class="btn" id="slipImage37">บันทึกเป็นรูป</button><button class="btn" id="slipPrint37">พิมพ์ / บันทึก PDF</button><button class="btn" data-go="ownerSale/${esc(id)}">กลับรายละเอียดขาย</button></div><div class="card">${saleSlipHtml37(s)}</div>`;
  $('#slipPrint37', main).onclick = () => window.print();
  $('#slipImage37', main).onclick = async e => {
    const button = e.currentTarget; button.disabled = true;
    try {
      await document.fonts?.ready;
      const lines = $('.sale-slip37', main).innerText.split('\n').filter(Boolean), wrapped = [];
      const evidenceStart = lines.indexOf('หลักฐานใบชั่ง'); if (evidenceStart >= 0) lines.splice(evidenceStart);
      lines.push('รูปใบชั่งและหลักฐานรับเงินดูได้ในแอพ');
      const canvas = document.createElement('canvas'); canvas.width = 1000; const ctx = canvas.getContext('2d'); ctx.font = '26px sans-serif';
      for (const line of lines) { let out = ''; for (const character of line) { if (ctx.measureText(out + character).width > 880) { wrapped.push(out); out = ''; } out += character; } wrapped.push(out); }
      canvas.height = 110 + wrapped.length * 42; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = '#064e3b'; ctx.font = '26px sans-serif'; wrapped.forEach((line, i) => ctx.fillText(line, 60, 65 + i * 42));
      const image = canvas.toDataURL('image/png'), filename = `ส่วนแบ่งยาง_${s.date}_${s.lotNo || s.id}.png`;
      openSheet({ title: 'ใบสรุปเป็นรูป', body: `<p>ตรวจรูปก่อนบันทึก บนโทรศัพท์สามารถกดค้างที่รูปเพื่อบันทึกได้ รูปนี้สรุปตัวเลข ส่วนรูปหลักฐานดูได้ในแอพหรือพิมพ์เป็น PDF</p><a class="btn pri block" href="${image}" download="${esc(filename)}">ดาวน์โหลดรูปใบสรุป</a><img src="${image}" alt="ใบสรุปยอดขาย ${baht(saleCalc(s).gross)}" style="display:block;width:100%;height:auto;margin-top:16px">` });
    } catch (error) { toast('ทำรูปไม่สำเร็จ: ' + error.message, 'warn'); } finally { button.disabled = false; }
  }; hydratePhotos(main);
} };

ROUTES.sales.render = function(main) {
  if (!ownerMode36()) return salesBefore36.render(main);
  const st = pstate('ownerSales37', () => ({ mode: 'month', ym: ymOf(today()), query: '', status: '', workerId: '' }));
  const drawRows = () => {
    const [from, to] = periodRange(st), state = state36(), rows = Farm36.filterSales(state, list('sales', r => inFarm(r) && r.date >= from && r.date <= to), { ...st, farmId: curFarm }, today()).sort(byDateDesc);
    $('#saleResults37', main).innerHTML = `<p role="status">พบ ${rows.length} รายการ · ส่วนเจ้าของสวนหลังค่ารถ ${baht(sum(rows, r => saleCalc(r).ownerAfterTransport))}</p>` + (rows.map(r => `<div class="card"><h3>${thDate(r.date)} · ${esc(r.buyer || PRODUCTS[r.product])}</h3><p>${fmt(r.weight, 2)} กก. · เจ้าของสวนหลังค่ารถ ${baht(saleCalc(r).ownerAfterTransport)}</p><p>ค่ายางค้างรับ ${baht(Farm36.outstanding(state, 'receive', r, today()))}</p><button class="btn" data-go="ownerSale/${esc(r.id)}">ดูส่วนแบ่ง / รับเงิน / จ่ายคนกรีด</button><button class="btn" data-go="saleSlip37/${esc(r.id)}">ใบสรุป</button></div>`).join('') || '<div class="card">ไม่มีรายการตรงกับตัวกรอง ลองเปลี่ยนช่วงวันที่หรือล้างตัวกรอง</div>');
  };
  main.innerHTML = `<button class="btn pri block" id="newOwnerSale37">ขายยาง · เจ้าของสวน 55% คนกรีด 45%</button>${periodNav(st)}<div class="card"><label class="fl" for="saleQuery37">ค้นชื่อผู้รับซื้อ คนกรีด แปลง วันที่ หรือเลขใบชั่ง</label><input class="inp" id="saleQuery37" type="search" value="${esc(st.query)}"><div class="fields"><div class="field"><label class="fl" for="saleStatus37">สถานะ</label><select class="inp" id="saleStatus37">${Object.entries({ '': 'ทุกสถานะ', receive: 'ยังไม่รับเงินครบ', received: 'รับเงินครบแล้ว', worker: 'ส่วนแบ่งคนกรีดคงค้าง', workerPaid: 'ปิดส่วนแบ่งแล้วตามลำดับรายการ' }).map(([k, v]) => option36(k, v, st.status)).join('')}</select></div><div class="field"><label class="fl" for="saleWorker37">คนกรีด</label><select class="inp" id="saleWorker37">${option36('', 'ทุกคน', st.workerId)}${list('workers').map(w => option36(w.id, w.name, st.workerId)).join('')}</select></div></div><button class="btn" id="clearFilters37">ล้างตัวกรอง</button><p class="hint">สถานะส่วนแบ่งใช้การจัดสรรเงินจ่ายและเงินเบิกให้รายการเก่าก่อน ดูรายละเอียดในใบสรุป</p></div><div id="saleResults37"></div>`;
  $('#newOwnerSale37', main).onclick = quickSale; $('#saleQuery37', main).oninput = e => { st.query = e.target.value; drawRows(); };
  $('#saleStatus37', main).onchange = e => { st.status = e.target.value; drawRows(); }; $('#saleWorker37', main).onchange = e => { st.workerId = e.target.value; drawRows(); };
  $('#clearFilters37', main).onclick = () => { st.query = st.status = st.workerId = ''; ROUTES.sales.render(main); }; bindPeriod(main, st, () => ROUTES.sales.render(main)); drawRows();
};

const homeBefore37 = ROUTES.home.render;
function viewAllFarms37() {
  curFarm = 'all'; try { localStorage.setItem('rf_farm', curFarm); } catch (e) { }
  render();
}
ROUTES.home.render = function(main) {
  homeBefore37.call(this, main); if (!ownerMode36() || !list('farms').length) return;
  const cash = cashReport35('0000-01-01', today()), split = Farm36.cashOwnership(state36(), cash.net, today(), curFarm);
  const due = list('sales', r => inFarm(r) && r.dueDate && r.dueDate <= today() && Farm36.outstanding(state36(), 'receive', r, today()) > 0);
  const transport = list('sales', r => inFarm(r) && r.date <= today() && r.transportMethod === 'separate' && Farm36.outstanding(state36(), 'transport', r, today()) > 0);
  const oldBackup = !META.lastBackupAt || Date.now() - META.lastBackupAt > 7 * 86400000 || META.lastBackupComplete === false;
  const card = document.createElement('section'); card.className = 'card'; card.innerHTML = `<h3>เงินรับ–จ่ายสะสมถึงวันนี้</h3><dl class="kv"><dt>เงินสุทธิจากบันทึก</dt><dd>${baht(split.cashNet)}</dd><dt>เงินรับที่ควรกันไว้ให้คนกรีด</dt><dd>${baht(split.workerReserve)}</dd><dt>เงินส่วนเจ้าของสวนในบันทึก</dt><dd>${baht(split.ownerCash)}</dd></dl><p class="hint">คำนวณเฉพาะเงินที่รับและจ่ายจริง แบ่งเงินรับบางส่วนตามส่วนแบ่งของแต่ละครั้งขาย แล้วหักเงินจ่าย/เบิก/หักกลบที่จัดสรรให้คนกรีด ไม่รวมเงินตั้งต้น จึงไม่ใช่ยอดธนาคาร</p>${split.shortfall ? `<p class="warn">เงินสุทธิจากบันทึกต่ำกว่าเงินที่ควรกันให้คนกรีด ${baht(split.shortfall)} ตรวจยอดรับ–จ่ายและเงินตั้งต้นก่อนใช้ยอดนี้</p>` : ''}${cash.unassigned ? '<p class="warn">มีรายการไม่ระบุสวน ยอดของแต่ละสวนอาจยังไม่ครบ</p>' : ''}<p>รายจ่ายและค่ารถยังค้างจ่าย ${baht(cash.expenseOwed)} · ส่วนแบ่ง/ค่าแรงค้างจ่าย ${baht(cash.workerOwed)}</p><button class="btn" data-go="cash">ดูรายการเงินรับ–จ่าย</button></section>`;
  $('.owner36', main).after(card);
  const alerts = document.createElement('section'); alerts.className = 'card'; alerts.innerHTML = `<h3>เรื่องที่ควรตรวจวันนี้</h3>${due.length ? `<p class="warn">ถึงนัดรับค่ายาง ${due.length} รายการ · ${baht(sum(due, r => Farm36.outstanding(state36(), 'receive', r, today())))}</p><button class="btn" data-go="debts">ตรวจเงินค้างรับ</button>` : '<p>ไม่มีค่ายางถึงนัดรับที่ยังค้าง</p>'}${transport.length ? `<p>ค่ารถยังไม่ได้จ่าย ${transport.length} รายการ</p><button class="btn" data-go="debts">ตรวจค่ารถค้างจ่าย</button>` : ''}${oldBackup ? '<p class="warn">ควรสำรองไฟล์พร้อมรูป: ยังไม่มีไฟล์ หรือเกิน 7 วัน หรือรูปยังไม่ครบ</p><button class="btn" data-go="safety">สำรองข้อมูล</button>' : '<p>มีไฟล์สำรองล่าสุดภายใน 7 วัน</p>'}<button class="btn" data-go="connection37">ตรวจการเชื่อม Google Sheets</button><button class="btn" data-go="phoneCheck37">ลองใช้งานบนโทรศัพท์ของเจ้าของสวน</button>`; card.after(alerts);
  if (curFarm !== 'all' && !list('sales', inFarm).length && list('sales').length) {
    const notice = document.createElement('section'); notice.className = 'card';
    notice.innerHTML = '<h3>ยอดขายอยู่ในสวนอีกชื่อหนึ่ง</h3><p>สวนที่เลือกยังไม่มีรายการขาย แต่เครื่องนี้มีรายการขายของสวนอื่นอยู่แล้ว</p><button class="btn pri block" id="viewAllFarms37">ดูยอดทุกสวน</button>';
    $('.owner36', main).after(notice); $('#viewAllFarms37', notice).onclick = viewAllFarms37;
  }
};
function renderJoin38(main) {
  main.innerHTML = `<section class="card owner36"><h2>${esc(APP_NAME)}</h2><p>เปิดแอพแล้วรับข้อมูลสวนและยอดเงินอัตโนมัติ ไม่ต้องกรอกรหัสหรือแตะลิงก์เชื่อมสวน</p><p>หากยังไม่มีข้อมูล ให้เปิดอินเทอร์เน็ตแล้วรอสักครู่</p><details><summary>กู้ไฟล์สำรอง / การเชื่อมต่ออื่น</summary><button class="btn" data-go="safety">กู้ไฟล์สำรอง</button><button class="btn" data-go="connectionLegacy37">การเชื่อมต่อขั้นสูง</button></details></section>`;
}
ROUTES.connection37 = { title: 'เชื่อมสวน', render(main) {
  if (!hasGardenConnection39()) return renderJoin38(main);
  main.innerHTML = `<section class="card owner36"><h2>เครื่องนี้เชื่อมสวนแล้ว</h2><p>เปิดแอพแล้วรับข้อมูลอัตโนมัติ เมื่อบันทึกจะส่งไปสวนเดิม และรับข้อมูลจากเครื่องอื่นทุก 1 นาทีขณะเปิดแอพ</p><p role="status">${syncing ? 'กำลังรับและส่งข้อมูล...' : syncErr ? 'ยังส่งข้อมูลไม่สำเร็จ: ' + esc(syncErr) : META.lastSyncAt ? 'ซิงค์ล่าสุด ' + new Date(META.lastSyncAt).toLocaleString('th-TH') : 'กำลังรอรับข้อมูลครั้งแรก'} · รอส่ง ${dirtyCount()} รายการ</p><button class="btn pri block" id="refreshFarm38">รับยอดล่าสุดตอนนี้</button><button class="btn block" data-go="home">กลับหน้าหลัก</button><p id="refreshStatus38" role="status" aria-live="polite"></p><p>เครื่องอื่นเปิดเว็บสวนยางเดิมได้เลย ไม่ต้องตั้งค่าหรือใช้ลิงก์เชื่อมสวน</p><details><summary>สำรอง / การเชื่อมต่ออื่น</summary><button class="btn" data-go="safety">สำรองข้อมูล</button><button class="btn" data-go="connectionLegacy37">การเชื่อมต่อขั้นสูง</button></details></section>`;
  $('#refreshFarm38', main).onclick = async e => {
    const button = e.currentTarget; button.disabled = true;
    try {
      if (syncing) await sync(false);
      await dataLock35(async () => { const meta = clone35(META); meta.lastPull = 0; await commit35({}, meta); });
      await sync(true); if (syncErr) throw new Error(syncErr);
      viewAllFarms37(); go('home');
    } catch (error) { if (button.isConnected) $('#refreshStatus38', main).textContent = error.message; }
    finally { if (button.isConnected) button.disabled = false; }
  };

} };
ROUTES.connectionLegacy37 = { title: 'การเชื่อมต่อขั้นสูง', render(main) {
  const last = META.connectionCheck37;
  main.innerHTML = `<div class="card"><h2>ข้อมูลของสวนอยู่ที่ไหน</h2><p>${S().scriptUrl ? 'ตั้งค่าระบบกลางไว้แล้ว' : 'ยังเก็บข้อมูลในเครื่องนี้'} · รอส่ง ${dirtyCount()} รายการ</p><p>เว็บไซต์ฉบับ ${APP_VERSION} ต้องใช้ระบบกลางที่รองรับเงินเป็นงวดและค่ารถ การเผยแพร่เว็บไซต์ไม่ได้อัปเดตระบบกลางให้เอง</p><div id="connectionResult37" role="status">${last ? esc(last.message) + ' · ตรวจ ' + new Date(last.at).toLocaleString('th-TH') : 'ยังไม่ได้ตรวจความพร้อมของระบบกลาง'}</div><button class="btn pri" id="connectionPing37">ตรวจระบบกลางตอนนี้</button><button class="btn" data-go="settings">ตั้งค่าลิงก์และรหัสเชื่อมต่อ</button><button class="btn" data-go="safety">สำรองข้อมูลพร้อมรูป</button><p class="hint">หากยังเป็นฉบับเก่า ให้เจ้าของโปรเจกต์อัปเดต Apps Script เดิมโดยรักษารหัสและ Google Sheets เดิม ข้อมูลในเครื่องที่รอส่งจะยังเก็บไว้</p></div>`;
  main.insertAdjacentHTML('afterbegin', `<section class="card"><h2>รับยอดเงินจากสวนเดิม</h2><p>หากติดตั้งแล้วไม่เห็นข้อมูล ให้คัดลอกลิงก์เชื่อมสวนที่ได้รับ แล้ววางในแอพที่เปิดจากไอคอนบนหน้าจอมือถือ</p><div class="field"><label class="fl" for="setupLink37">ลิงก์เชื่อมสวน</label><textarea class="inp" id="setupLink37" rows="3" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="วางลิงก์เชื่อมสวนที่นี่"></textarea></div><button class="btn pri block" id="setupConnect37">เชื่อมและดึงยอดเงิน</button>${S().scriptUrl && S().apiKey ? '<button class="btn block" id="pullAll37">ดึงข้อมูลและดูยอดทุกสวน</button>' : ''}<p id="setupStatus37" role="status" aria-live="polite"></p></section>`);
  const receive = async (button, link) => {
    button.disabled = true; $('#setupStatus37', main).textContent = 'กำลังเชื่อมและรับยอดเงิน...';
    try {
      if (syncing) await sync(false);
      if (link) await connectFromLink37(link);
      else { await dataLock35(async () => { const meta = clone35(META); meta.lastPull = 0; await commit35({}, meta); }); }
      $('#setupLink37', main).value = '';
      await sync(true);
      if (syncErr) throw new Error(syncErr);
      if (syncing || !META.lastSyncAt) throw new Error('กำลังรับข้อมูล กรุณารอสักครู่แล้วลองอีกครั้ง');
      viewAllFarms37(); go('home');
    } catch (e) { if (button.isConnected) $('#setupStatus37', main).textContent = 'ยังรับข้อมูลไม่สำเร็จ: ' + e.message; }
    finally { if (button.isConnected) button.disabled = false; }
  };
  $('#setupConnect37', main).onclick = e => {
    const link = $('#setupLink37', main).value.trim();
    if (!link) return $('#setupStatus37', main).textContent = 'กรุณาวางลิงก์เชื่อมสวนก่อน';
    return receive(e.currentTarget, link);
  };
  if ($('#pullAll37', main)) $('#pullAll37', main).onclick = e => receive(e.currentTarget);
  $('#connectionPing37', main).onclick = async e => {
    const button = e.currentTarget; button.disabled = true;
    try { const response = await api('ping'); const supported = response.syncProtocol >= 2 && response.ownerAccounting === 1;
      const message = supported ? `ระบบกลาง ${response.version || ''} รองรับข้อมูลฉบับนี้แล้ว` : `ระบบกลาง ${response.version || 'ฉบับเก่า'} ยังไม่รองรับเงินเป็นงวดและค่ารถ กรุณาอัปเดต Apps Script ก่อนส่งข้อมูล`;
      META.connectionCheck37 = { supported, message, at: Date.now() }; await store.putMeta(); $('#connectionResult37', main).textContent = message;
      if (supported) { const b = document.createElement('button'); b.className = 'btn pri'; b.textContent = 'ส่งข้อมูลที่รอและรับคำยืนยัน'; b.onclick = () => sync(true); $('#connectionResult37', main).appendChild(b); }
    } catch (error) { $('#connectionResult37', main).textContent = 'ยังตรวจไม่ได้: ' + error.message + ' · ข้อมูลที่บันทึกในเครื่องยังเก็บไว้'; }
    finally { button.disabled = false; }
  };
} };
ROUTES.phoneCheck37 = { title: 'ลองแอพบนโทรศัพท์ของเจ้าของสวน', render(main) {
  main.innerHTML = `<div class="card"><h2>ให้เจ้าของสวนลองด้วยโทรศัพท์ที่ใช้จริง</h2><p>เปิดเว็บสวนเดิมบนโทรศัพท์ และใช้การขายจริงครั้งถัดไป หลีกเลี่ยงการเพิ่มยอดทดลองลงบัญชีสวนจริง</p><ol><li>อ่านตัวหนังสือและกดขายยางได้สะดวก</li><li>กรอกน้ำหนัก ราคา และค่ารถด้วยแป้นตัวเลข</li><li>กดย้อนกลับแล้วข้อมูลที่กรอกยังอยู่</li><li>แนบใบชั่งและตรวจเจ้าของสวน 55% คนกรีด 45%</li><li>หลังบันทึก ตรวจสถานะเก็บในเครื่อง / ส่งข้อมูลสำเร็จ</li><li>ลองเปิดแอพที่ติดตั้งไว้เมื่อปิดอินเทอร์เน็ต โดยไม่บันทึกยอดซ้ำ</li><li>เปิดอินเทอร์เน็ตแล้วตรวจข้อมูลที่รอส่ง และสำรองไฟล์พร้อมรูป</li></ol><p class="hint">การตรวจหน้าจอขนาดมือถือบนคอมพิวเตอร์ไม่ยืนยันว่าทดสอบบนโทรศัพท์ของเจ้าของสวนแล้ว หากอ่านยากหรือปุ่มกดยาก ให้แจ้งรุ่นโทรศัพท์และจุดที่ติดขัด</p><button class="btn" data-go="home">กลับหน้าหลัก</button></div>`;
} };
const menuBefore37 = ROUTES.menu.render;
ROUTES.menu.render = function(main) { menuBefore37.call(this, main); main.insertAdjacentHTML('afterbegin', '<div class="card"><button class="btn" data-go="connection37">เชื่อมสวน / รับยอดล่าสุด</button><button class="btn" data-go="phoneCheck37">ลองบนโทรศัพท์ของเจ้าของสวน</button></div>'); };
// Adapt to phone width, browser controls, cutouts and the on-screen keyboard.
const responsiveStyle391 = document.createElement('style');
responsiveStyle391.textContent = `
:root{--app-width:100%;--app-height:100vh;--visible-height:100vh;--visible-top:0px;--top-height:54px}
body{min-height:100vh;min-height:var(--app-height)}
main{width:100%;max-width:none;min-width:0;min-height:calc(var(--app-height) - var(--top-height));padding:12px 12px calc(var(--nav-h) + 24px);padding:12px max(12px,env(safe-area-inset-right)) calc(var(--nav-h) + 24px + env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left))}
body.has-fab392 main{padding-bottom:calc(var(--nav-h) + 88px);padding-bottom:calc(var(--nav-h) + 88px + env(safe-area-inset-bottom))}
body:has(.fab) main{padding-bottom:calc(var(--nav-h) + 88px + env(safe-area-inset-bottom))}
.nav-in{max-width:none;padding-left:env(safe-area-inset-left);padding-right:env(safe-area-inset-right)}
.nav button{min-width:0;overflow-wrap:break-word}
.top{padding:8px 12px;padding-top:calc(8px + env(safe-area-inset-top));padding-left:max(12px,env(safe-area-inset-left));padding-right:max(12px,env(safe-area-inset-right))}
.top h1,.top h1 span{min-width:0;overflow:hidden;text-overflow:ellipsis}
.top .sync-btn,.top .back,.sheet-h .x{flex-shrink:0}
.grid2{grid-template-columns:repeat(2,minmax(0,1fr))}
.grid3{grid-template-columns:repeat(3,minmax(0,1fr))}
.fields{grid-template-columns:repeat(6,minmax(0,1fr))}
.menu-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
.card,.card>*,.row>*,.actions36>*,.actions35>*,.menu-grid>*{min-width:0}
.btn{min-width:0;white-space:normal;overflow-wrap:break-word;overflow-wrap:anywhere}
.fab{right:16px;right:max(16px,env(safe-area-inset-right));bottom:calc(var(--nav-h) + 16px);bottom:calc(var(--nav-h) + 16px + env(safe-area-inset-bottom))}
.tbl-wrap{min-width:0;max-width:100%}
.kv{grid-template-columns:minmax(0,1fr) auto;gap:6px 12px}
.kv dt,.kv dd{min-width:0;overflow-wrap:anywhere}
.overlay{top:0;right:0;bottom:auto;left:0;height:100vh;top:var(--visible-top);height:var(--visible-height)}
.sheet{min-width:0;max-height:calc(100vh - 8px);max-height:calc(var(--visible-height) - 8px);max-height:calc(var(--visible-height) - max(8px,env(safe-area-inset-top)))}
.sheet-h,.sheet-f{flex-shrink:0}
.sheet-h h2{min-width:0;overflow-wrap:anywhere}
.sheet-b{min-width:0;min-height:0;overscroll-behavior:contain}
.sheet-f{flex-wrap:wrap}
.sheet-f .btn{flex:1 1 100px}
img,video,canvas{max-width:100%}
.worker35{max-width:100%;overflow-wrap:anywhere}
@media(max-width:480px){
  .field.half,.field.third,.sale-step37 .field.half{grid-column:span 6}
  body.owner-mode36 .actions36{gap:10px;margin:12px 0}
  body.owner-mode36 .actions36 .btn{flex-direction:column;min-height:78px;padding:10px 8px;font-size:16px;line-height:1.5}
  .sheet-h,.sheet-b,.sheet-f{padding-left:12px;padding-right:12px;padding-left:max(12px,env(safe-area-inset-left));padding-right:max(12px,env(safe-area-inset-right))}
  .owner-sale-row36{flex-wrap:wrap}
  .owner-sale-row36 b{max-width:100%;overflow-wrap:anywhere}
  .row.wrap .btn{max-width:100%}
  .tbl.stackable td{min-width:0;overflow-wrap:anywhere;white-space:normal}
}
@media(max-width:420px){.grid3{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:359px){
  main{padding:8px 8px calc(var(--nav-h) + 24px);padding-left:max(8px,env(safe-area-inset-left));padding-right:max(8px,env(safe-area-inset-right))}
  .card{padding:12px}
  body.owner-mode36 .actions36{grid-template-columns:1fr;gap:8px}
  body.owner-mode36 .actions36 .btn{flex-direction:row;min-height:50px;font-size:16px}
  .grid2,.grid3{grid-template-columns:1fr}
  .menu-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media(min-width:560px){.menu-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media(min-width:700px){.sheet{max-height:90vh;max-height:calc(var(--visible-height) * .9)}}
@media(min-width:1000px){body.owner-mode36 .actions36{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media print{body,main{min-height:0}main{width:100%;max-width:none;padding:0}body.has-fab392 main,body:has(.fab) main{padding-bottom:0}}
`;
document.head.appendChild(responsiveStyle391);
// Use the visible viewport even on browsers without dynamic viewport CSS units.
// Pinch zoom must keep the layout stable so enlarged text remains readable.
function viewportMetrics392(w) {
  const layoutHeight = Math.max(1, Number(w.innerHeight) || 1), v = w.visualViewport;
  const unzoomed = v && Math.abs((Number(v.scale) || 1) - 1) < .01;
  return { layoutHeight, visibleHeight: unzoomed ? Math.max(1, Number(v.height) || layoutHeight) : layoutHeight,
    visibleTop: unzoomed ? Math.max(0, Number(v.offsetTop) || 0) : 0 };
}
function updateViewport392() {
  const m = viewportMetrics392(window), style = document.documentElement.style;
  style.setProperty('--app-height', m.layoutHeight + 'px');
  style.setProperty('--visible-height', m.visibleHeight + 'px');
  style.setProperty('--visible-top', m.visibleTop + 'px');
  const top = $('.top'); if (top) style.setProperty('--top-height', top.getBoundingClientRect().height + 'px');
  document.body.classList.toggle('has-fab392', !!$('.fab'));
}
function installViewport392() {
  updateViewport392();
  const refresh = debounce(updateViewport392, 40);
  window.addEventListener('resize', refresh);
  window.addEventListener('orientationchange', refresh);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', refresh);
    window.visualViewport.addEventListener('scroll', refresh);
  }
  const previousRender = render;
  render = function() { previousRender(); updateViewport392(); };
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installViewport392);
else installViewport392();
function workersCount40(ov) { return $$('input[name=saleWorker36]', ov).length; }
function parseScale40(text) {
  const normalized = String(text || '').split(/\r?\n/).map(normalizeThaiText).join('\n'), result = parseScaleText(normalized);
  const match = normalized.match(/(?:วันที่|date)\s*[:：]?\s*(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/i);
  result.date = '';
  if (match) {
    let year = Number(match[3]); if (year < 100) year += 2500; if (year > 2400) year -= 543;
    const date = `${year}-${match[2].padStart(2,'0')}-${match[1].padStart(2,'0')}`; if (Farm36.dateOK(date)) result.date = date;
  }
  return result;
}
function attachScaleReader40(ov, box, update) {
  const button = document.createElement('button'); button.className = 'btn block'; button.type = 'button'; button.textContent = 'อ่านใบชั่งช่วยกรอก'; box.appendChild(button);
  const read = async ref => {
    if (!ref) return toast('ถ่ายหรือเลือกรูปใบชั่งก่อน', 'warn');
    if (!navigator.onLine) return toast('รูปเก็บไว้ในเครื่องแล้ว อ่านตัวเลขได้เมื่อกลับมาออนไลน์ หรือกรอกเองได้เลย', 'warn');
    button.disabled = true; button.textContent = 'กำลังอ่านใบชั่ง...'; ov.evidenceBusy37 = num(ov.evidenceBusy37) + 1;
    $$('[data-save],[data-next37],input[type=file]', ov).forEach(b => b.disabled = true);
    try {
      if (isLocalRef(ref)) {
        const dataUrl = await store.photo('get', ref), uploaded = await api('photoUpload', { dataUrl, name: 'ใบชั่ง' });
        const cloudRef = 'd:' + uploaded.id; await store.photo('put', cloudRef, dataUrl);
        ov.photoRefs37.sale = ov.photoRefs37.sale.map(x => x === ref ? cloudRef : x); ref = cloudRef; box.drawEvidence37();
      }
      const response = await api('scale.read', { id: String(ref).slice(2) });
      if (!ov.isConnected) return;
      const parsed = parseScale40(response.text || '');
      if (!parsed.weight && !parsed.price && !parsed.date) { toast('อ่านตัวเลขไม่ชัด รูปเก็บไว้แล้ว กรอกตามใบชั่งได้เลย', 'warn'); return; }
      const review = openSheet({ title: 'ตรวจตัวเลขที่อ่านจากใบชั่ง', body: `<p>ตรวจเทียบกับรูปก่อนใช้ ตัวเลขที่ไม่ชัดให้แก้เอง การอ่านรูปยังไม่บันทึกยอดขาย</p>${input36('ocrWeight40','น้ำหนัก (กก.)',parsed.weight || '')}${input36('ocrPrice40','ราคา (บาท/กก.)',parsed.price || '')}${input36('ocrDate40','วันที่ขาย',parsed.date || $('#saleDate36',ov).value,'date')}${input36('ocrDrc40','DRC หากมี (%)',parsed.drc || '')}<details><summary>ข้อความจากใบชั่ง</summary><pre style="white-space:pre-wrap">${esc(response.text || '')}</pre></details>`, foot: '<button class="btn" data-cancel>กรอกเอง</button><button class="btn pri" data-use40>ตรวจแล้ว · ใช้ตัวเลขนี้</button>' });
      $('[data-cancel]',review).onclick = () => closeSheet(review,true);
      $('[data-use40]',review).onclick = () => {
        if (!ov.isConnected) return closeSheet(review,true);
        const weight = $('#ocrWeight40',review).value, price = $('#ocrPrice40',review).value, date = $('#ocrDate40',review).value, drc = $('#ocrDrc40',review).value;
        if ((weight && !(num(weight)>0)) || (price && !(num(price)>0)) || !Farm36.dateOK(date) || (drc && (!(num(drc)>0) || num(drc)>100))) return toast('ตรวจน้ำหนัก ราคา วันที่ และ DRC อีกครั้ง', 'warn');
        for (const [source,target] of [['ocrWeight40','saleWeight36'],['ocrPrice40','salePrice36'],['ocrDate40','saleDate36'],['ocrDrc40','saleDrc36']]) {
          const value = $('#'+source,review).value; if (value) { const field = $('#'+target,ov); field.value = value; field.dispatchEvent(new Event('input',{bubbles:true})); field.dispatchEvent(new Event('change',{bubbles:true})); }
        }
        update(); closeSheet(review,true); toast('เติมตัวเลขแล้ว ตรวจสถานะรับเงินในขั้นถัดไป', 'ok');
      };
    } catch (error) { if (ov.isConnected) toast('ยังอ่านใบชั่งไม่ได้: ' + error.message + ' · รูปยังเก็บไว้ กรอกเองได้', 'warn'); }
    finally { ov.evidenceBusy37--; if (button.isConnected) { button.disabled = false; button.textContent = 'อ่านใบชั่งช่วยกรอก'; } $$('[data-save],[data-next37],input[type=file]',ov).forEach(b=>b.disabled=!!ov.evidenceBusy37); }
  };
  button.onclick = () => read(ov.photoRefs37.sale[0]); box.onPhotoAdded40 = read;
}
async function undoSale40(id) {
  const s = get('sales',id); if (!s) throw new Error('ไม่พบรายการขาย');
  if (list('payments',p=>farmOf(p)===farmOf(s) && p.date>=s.date && Farm36.arr(s.workerIds).includes(p.workerId)).length) throw new Error('มีประวัติจ่ายคนกรีดแล้ว กรุณาตรวจรายละเอียดก่อนยกเลิกยอดขาย');
  const entries = list('settlements',r=>r.saleId===id).map(r=>['settlements',{...r,deleted:1,undoGroup40:id}]);
  list('prices',r=>r.saleId===id).forEach(r=>entries.push(['prices',{...r,deleted:1,undoGroup40:id}]));
  entries.push(['sales',{...s,deleted:1,undoGroup40:id}]); await saveBatch36(entries); toast('ยกเลิกบันทึกครั้งนี้แล้ว กู้คืนได้จากถังขยะ', 'ok');
}
const saveRecBeforeUndo40 = saveRec;
saveRec = async function(coll, record, ...options) {
  const old = record.id && DB[coll]?.get(record.id);
  if (Farm36.yes(old?.deleted) && old.undoGroup40 && !Farm36.yes(record.deleted) && ['sales','settlements','prices'].includes(coll)) {
    const entries = [];
    for (const c of ['sales','prices','settlements']) for (const r of DB[c].values()) if (Farm36.yes(r.deleted) && r.undoGroup40 === old.undoGroup40) {
      const restored = {...r,deleted:0}; delete restored.undoGroup40; entries.push([c,restored]);
    }
    await saveBatch36(entries); return DB[coll].get(record.id);
  }
  return saveRecBeforeUndo40(coll,record,...options);
};
function saleStages40(s, state = state36(), cutoff = today()) {
  const allocation = Farm36.workerAllocation(state,cutoff,Farm36.farm(state,s))[s.id], receive = Farm36.outstanding(state,'receive',s,cutoff);
  const transport = s.transportMethod === 'withheld' ? 0 : Farm36.outstanding(state,'transport',s,cutoff);
  const worker = allocation?.remaining ?? saleCalc(s).tapperTotal;
  return { receive, transport, worker, complete: receive === 0 && transport === 0 && worker === 0 };
}
let backupResult40 = null, backupRequest40 = null, backupCheckedAt40 = 0;
function backupLabel40(status) {
  if (!status) return 'กำลังตรวจการสำรองข้อมูล';
  if (status.failedAt > status.at) return 'สำรองครั้งล่าสุดไม่สำเร็จ กรุณาตรวจข้อมูล';
  if (!status.scheduled) return 'ยังไม่ได้ตั้งสำรองอัตโนมัติ';
  if (!status.at) return 'ตั้งสำรองรายวันแล้ว กำลังรอไฟล์แรก';
  if (!status.complete) return `สำรองข้อมูลแล้ว แต่มีรูปที่ยังไม่ครบ ${status.missing} รูป`;
  if (Date.now()-status.at > 2*86400000) return 'ไฟล์สำรองเกิน 2 วัน กรุณาตรวจระบบ';
  return `สำรองรายวันพร้อมรูปแล้ว · ${new Date(status.at).toLocaleDateString('th-TH')} · ${status.verified ? 'ตรวจไฟล์ผ่าน' : 'รอตรวจไฟล์'}`;
}
function renderBackupStatus40() {
  const el = $('#backupStatus40'); if (el) el.textContent = backupLabel40(backupResult40);
  if (!navigator.onLine || !hasGardenConnection39() || Date.now()-backupCheckedAt40 < 300000 || backupRequest40) return;
  backupCheckedAt40 = Date.now();
  backupRequest40 = api('backup.status').then(r=>{backupResult40=r.backup;const box=$('#backupStatus40');if(box)box.textContent=backupLabel40(r.backup);}).catch(()=>{const box=$('#backupStatus40');if(box)box.textContent='ยังตรวจสำรองบนระบบกลางไม่ได้ · สำรองไฟล์ในเครื่องได้ที่เมนูเพิ่มเติม';}).finally(()=>{backupRequest40=null;});
}
function auditIssues40() {
  const s=state36(), issues=[];
  for (const c of ['farms','workers']) {
    const seen=new Set(); for (const r of list(c)) { const key=Farm36.cleanName(r.name)+(c==='farms'?'|'+Farm36.cleanName(r.province):''); if(seen.has(key))issues.push(c==='farms'?'พบสวนชื่อซ้ำ':'พบคนกรีดชื่อซ้ำ');seen.add(key); }
  }
  for (const c of ['sales','settlements','rubberlots']) for (const r of list(c)) { const error=Farm36.error(s,c,r,r);if(error)issues.push(error); }
  return [...new Set(issues)];
}
const homeBefore40 = ROUTES.home.render;
ROUTES.home.render = function(main) {
  if (!ownerMode36()) return homeBefore40.call(this,main);
  if (!list('farms').length) return ownerStart36(main);
  const cash=cashReport35('0000-01-01',today(),curFarm), owned=Farm36.cashOwnership(state36(),cash.net,today(),curFarm), issues=auditIssues40();
  const latest=list('sales',inFarm).sort(byDateDesc).slice(0,3), workers=activeWorkers().filter(w=>w.payType==='share');
  main.innerHTML=`<section class="card owner36 owner-hero40"><div class="row"><h2>สวนยาง</h2><span class="sp"></span><span class="badge">${navigator.onLine?'ออนไลน์':'ใช้ออฟไลน์'}</span></div><p>${esc(curFarm==='all'&&list('farms').length===1?list('farms')[0].name:curFarm==='all'?'ทุกสวน':farmName(curFarm))}</p><div class="money-label40">เงินส่วนเจ้าของสวนในบันทึก</div><div class="money40">${baht(owned.ownerCash)}</div><p class="hint">จากเงินรับ–จ่ายจริง หักเงินที่ต้องกันให้คนกรีดแล้ว ไม่ใช่ยอดธนาคาร</p><button class="btn" data-go="cash">ดูที่มาของยอดเงิน</button></section>
  <div class="grid2 summary40"><button class="card" data-go="debts"><span>ค่ายางค้างรับ</span><b>${baht(cash.receivable)}</b><small>แตะดูรายการ</small></button><button class="card" data-go="workers"><span>คนกรีดยางค้างจ่าย</span><b>${baht(cash.workerOwed)}</b><small>เงินที่ยังต้องจ่ายจริง</small></button></div>
  <section class="actions36 daily-actions40"><button class="btn pri" id="ownerSale36">${ic('coins')}ขายยาง</button><button class="btn" id="ownerPay36">${ic('wallet')}จ่ายคนกรีดยาง</button><button class="btn" id="ownerExpense36">${ic('receipt')}บันทึกค่าใช้จ่าย</button></section>
  ${syncErr?`<div class="alert" role="status">ยังส่งข้อมูลไม่สำเร็จ · ${esc(syncErr)}<button class="btn" id="retryHome40">ลองส่งอีกครั้ง</button></div>`:dirtyCount()?'<div class="alert" role="status">ข้อมูลเก็บในเครื่องแล้ว กำลังรอส่งเมื่อออนไลน์</div>':''}
  ${issues.length?`<section class="card"><h3>เรื่องที่ควรตรวจ</h3>${issues.map(x=>`<p>${esc(x)}</p>`).join('')}<button class="btn" data-go="conflicts">ตรวจรายการ</button></section>`:''}
  <section class="card"><h3>รายการขายล่าสุด</h3>${latest.map(s=>{const q=saleStages40(s);return `<button class="owner-sale-row36" data-go="ownerSale/${esc(s.id)}"><span>${thDate(s.date)} · ${fmt(s.weight,2)} กก.<small class="status-note40">${q.complete?'รับและจ่ายครบแล้ว':q.receive?'ยังรับค่ายางไม่ครบ':q.transport?'ยังจ่ายค่ารถไม่ครบ':'ยังจ่ายคนกรีดไม่ครบ'}</small></span><b>${baht(saleCalc(s).ownerAfterTransport)}</b></button>`;}).join('')||'<p>ยังไม่มีรายการขาย</p>'}<button class="btn" data-go="sales">ดูการขายทั้งหมด</button></section>
  <section class="card"><h3>คนกรีดยาง</h3>${workers.map(w=>`<div class="row wrap"><b>${esc(w.name)}</b><span class="sp"></span><span>ค้าง ${baht(workerLedger(w.id).balance)}</span><button class="btn" data-workerpay36="${esc(w.id)}">จ่ายเงิน</button></div>`).join('')||'<p>ยังไม่มีรายการคนกรีด</p>'}</section>
  <details class="card"><summary>เพิ่มเติม / สำรองข้อมูล</summary><p id="backupStatus40" role="status">${backupLabel40(backupResult40)}</p><p class="hint">สำรองเฉพาะข้อมูลที่ส่งถึงระบบกลางแล้ว รูปและรายการที่ยังอยู่ในเครื่องให้ส่งก่อน</p><button class="btn" data-go="safety">สำรอง / กู้คืน / ประวัติแก้ไข</button><button class="btn" data-go="connection37">รับข้อมูลล่าสุด</button><button class="btn" data-go="menu">เครื่องมือดูแลสวนทั้งหมด</button><button class="link" id="ownerConfig36">ตั้งค่าหน้าเจ้าของสวน</button></details>`;
  $('#ownerSale36',main).onclick=quickSale; $('#ownerPay36',main).onclick=()=>workerPayment36(); $('#ownerExpense36',main).onclick=()=>openForm('expenses',null,{paid:true,paidDate:today()}); $('#ownerConfig36',main).onclick=configureOwner36;
  $$('[data-workerpay36]',main).forEach(b=>b.onclick=()=>workerPayment36(b.dataset.workerpay36)); if($('#retryHome40',main))$('#retryHome40',main).onclick=()=>sync(true);
  renderBackupStatus40();
};
const saleBefore40=ROUTES.ownerSale.render;
ROUTES.ownerSale.render=function(main,id){
  saleBefore40.call(this,main,id); const s=get('sales',id);if(!s)return;const q=saleStages40(s);
  main.insertAdjacentHTML('afterbegin',`<section class="card"><h2>${q.complete?'รับและจ่ายครบแล้ว':'ตรวจรับ–จ่ายครั้งนี้'}</h2>${[['receive','รับเงินค่ายาง',q.receive],['transport','จ่ายค่ารถ',q.transport],['worker','จ่ายคนกรีดยาง',q.worker]].map(([key,label,amount],i)=>`<div class="stage40"><span class="stage-number40">${i+1}</span><div><b>${label}</b><p>${amount>0?'ค้าง '+baht(amount):key==='transport'&&s.transportMethod==='withheld'?'ผู้ซื้อหักค่ารถแล้ว':'ครบแล้ว'}</p></div>${amount>0?`<button class="btn" data-stage40="${key}">บันทึก${key==='receive'?'รับ':'จ่าย'}</button>`:'<span class="badge">✓</span>'}</div>`).join('')}<p class="hint">ส่วนแบ่งคนกรีดจัดสรรตามรายการเก่าก่อน ปุ่มจ่ายเงินจะแสดงยอดค้างรวมของคนกรีด</p><button class="link" id="undoSale40">ยกเลิกบันทึกขายครั้งนี้</button></section>`);
  $$('[data-stage40]',main).forEach(b=>b.onclick=()=>b.dataset.stage40==='worker'?workerPayment36(Farm36.arr(s.workerIds).length===1?Farm36.arr(s.workerIds)[0]:undefined):settlementSheet36('sales',s,b.dataset.stage40));
  $('#undoSale40',main).onclick=async()=>{if(!(await confirmBox('ยกเลิกบันทึกขายครั้งนี้ และรายการรับค่ายาง/ค่ารถที่ผูกไว้?','ยกเลิกบันทึก')))return;try{await undoSale40(id);go('home');}catch(e){toast(e.message,'warn');}};
};
const modernStyle40=document.createElement('style');
modernStyle40.textContent=`
body.owner-mode36{--bg:#f3f6f0;--r:20px;--shadow:0 3px 16px rgba(20,60,40,.055)}
:root[data-theme=dark] body.owner-mode36{--bg:#101b16}
@media(prefers-color-scheme:dark){:root:not([data-theme=light]) body.owner-mode36{--bg:#101b16}}
.owner-hero40{background:linear-gradient(135deg,#064e3b,#087653);color:#fff;padding:22px}
.owner-hero40 h2{font-size:24px}.owner-hero40 .hint{color:#e0f2e8;line-height:1.7}.owner-hero40>.row{gap:10px}.owner-hero40 .btn{background:#fff;color:#064e3b;border-color:#fff}.owner-hero40 .badge{color:#fff;background:rgba(255,255,255,.16)}
.money-label40{font-size:18px;margin-top:20px}.money40{font-size:32px;font-size:clamp(28px,7vw,46px);font-weight:700;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.summary40>.card{text-align:left;font:inherit;color:var(--ink);cursor:pointer;display:flex;flex-direction:column;gap:8px}.summary40 b{font-size:24px;overflow-wrap:anywhere}.summary40 small,.status-note40{font-size:14px;color:var(--ink2)}
.status-note40{display:block;margin-top:6px}.daily-actions40{grid-template-columns:repeat(3,minmax(0,1fr))!important}.daily-actions40 .btn{flex-direction:column;gap:8px;font-size:18px!important;min-height:104px!important}
.fields>details{grid-column:1/-1}.stage40{display:flex;align-items:center;gap:12px;padding:14px 0;border-bottom:1px solid var(--line)}.stage40>div{flex:1;min-width:0}.stage40 p{margin:4px 0}.stage-number40{border-radius:50%;width:30px;height:30px;display:grid;place-items:center;background:var(--pri-soft);color:var(--pri);flex-shrink:0}.stage40 .btn{flex-shrink:0}
@media(max-width:480px){.daily-actions40{grid-template-columns:1fr!important;gap:10px}.daily-actions40 .btn{flex-direction:row!important;min-height:56px!important;font-size:18px!important}.summary40{grid-template-columns:1fr 1fr!important}.summary40 b{font-size:20px}.owner-hero40{padding:18px}.stage40{flex-wrap:wrap}.stage40 .btn{min-height:48px}.owner-sale-row36{gap:8px}}
@media(max-width:320px){.summary40{grid-template-columns:1fr!important}.stage40 .btn{width:100%}}
body.owner-mode36 .nav [data-nav=__add]{display:none}
@media print{.owner-hero40{background:#fff;color:#000}.owner-hero40 .hint{color:#000}}
`;document.head.appendChild(modernStyle40);
const style37 = document.createElement('style');
const joinStyle38 = document.createElement('style'); joinStyle38.textContent = '.owner36 details{margin-top:24px}.owner36 details .btn{margin-top:12px}'; document.head.appendChild(joinStyle38);
style37.textContent = '.sale-step37[hidden],[data-save][hidden],.sheet button[hidden]{display:none!important}.sale-progress37{font-size:18px;font-weight:700;padding:10px 0;color:var(--pri)}.evidence37{margin:12px 0}.evidence37 .btn{margin:8px 0}.sale-slip37{max-width:740px;margin:auto}.sale-slip37 h2{line-height:1.5}.sale-slip37 .kv{overflow-wrap:anywhere}.sale-step37 .fields{margin-bottom:12px}@media(max-width:480px){.sale-step37 .field.half{width:100%;flex-basis:100%}.sale-progress37{font-size:18px}.sale-step37 .btn{min-height:48px}.sheet-f{flex-wrap:wrap}.sale-slip37{font-size:16px}}@media print{.sale-slip37 .photos{break-inside:avoid}.no-print{display:none!important}.sale-slip37{font-size:13pt;color:#000}}'; document.head.appendChild(style37);
