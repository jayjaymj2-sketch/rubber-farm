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
  $$('input[type=file]', box).forEach(input => input.onchange = async () => {
    const file = input.files[0]; if (!file) return;
    if (ov.photoRefs37[key].length >= 3) { toast('แนบได้ไม่เกิน 3 รูป', 'warn'); input.value = ''; return; }
    if (!/^image\//.test(file.type) || file.size > 20 * 1024 * 1024) { toast('เลือกรูปภาพขนาดไม่เกิน 20 MB', 'warn'); input.value = ''; return; }
    ov.evidenceBusy37 = num(ov.evidenceBusy37) + 1; $('[data-photo-status37]', box).textContent = 'กำลังเก็บรูป กรุณารอสักครู่';
    $$('[data-save],[data-next37],input[type=file]', ov).forEach(b => b.disabled = true);
    try { const ref = await addLocalPhoto(await compressImage(file, 700000, 1600)); ov.photoRefs37[key].push(ref); draw(); }
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
  attachEvidence37(ov, 'sale', steps[0], 'รูปใบชั่ง');
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
:root{--app-width:1100px}
body{min-height:100dvh}
main{width:100%;max-width:var(--app-width);min-width:0;padding:12px max(12px,env(safe-area-inset-right)) calc(var(--nav-h) + 24px + env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left))}
body:has(.fab) main{padding-bottom:calc(var(--nav-h) + 88px + env(safe-area-inset-bottom))}
.nav-in{max-width:var(--app-width);padding-left:env(safe-area-inset-left);padding-right:env(safe-area-inset-right)}
.top{padding-left:max(12px,env(safe-area-inset-left));padding-right:max(12px,env(safe-area-inset-right))}
.top h1,.top h1 span{min-width:0;overflow:hidden;text-overflow:ellipsis}
.top .sync-btn,.top .back,.sheet-h .x{flex-shrink:0}
.grid2{grid-template-columns:repeat(2,minmax(0,1fr))}
.grid3{grid-template-columns:repeat(3,minmax(0,1fr))}
.fields{grid-template-columns:repeat(6,minmax(0,1fr))}
.menu-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
.card,.card>*,.row>*,.actions36>*,.actions35>*,.menu-grid>*{min-width:0}
.btn{min-width:0;white-space:normal;overflow-wrap:anywhere}
.fab{right:max(16px,env(safe-area-inset-right),calc((100vw - var(--app-width)) / 2 + 16px))}
.tbl-wrap{min-width:0;max-width:100%}
.kv{grid-template-columns:minmax(0,1fr) auto;gap:6px 12px}
.kv dt,.kv dd{min-width:0;overflow-wrap:anywhere}
.sheet{min-width:0;max-height:calc(100dvh - max(8px,env(safe-area-inset-top)))}
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
  .sheet-h,.sheet-b,.sheet-f{padding-left:max(12px,env(safe-area-inset-left));padding-right:max(12px,env(safe-area-inset-right))}
  .owner-sale-row36{flex-wrap:wrap}
  .owner-sale-row36 b{max-width:100%;overflow-wrap:anywhere}
  .row.wrap .btn{max-width:100%}
  .tbl.stackable td{min-width:0;overflow-wrap:anywhere;white-space:normal}
}
@media(max-width:420px){.grid3{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:359px){
  main{padding-top:8px;padding-left:max(8px,env(safe-area-inset-left));padding-right:max(8px,env(safe-area-inset-right))}
  .card{padding:12px}
  body.owner-mode36 .actions36{grid-template-columns:1fr;gap:8px}
  body.owner-mode36 .actions36 .btn{flex-direction:row;min-height:50px;font-size:16px}
  .grid2,.grid3{grid-template-columns:1fr}
  .menu-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media(min-width:560px){.menu-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media(min-width:700px){.sheet{max-height:90dvh}}
@media print{main{width:100%;max-width:none;padding:0}body:has(.fab) main{padding-bottom:0}}
`;
document.head.appendChild(responsiveStyle391);
const style37 = document.createElement('style');
const joinStyle38 = document.createElement('style'); joinStyle38.textContent = '.owner36 details{margin-top:24px}.owner36 details .btn{margin-top:12px}'; document.head.appendChild(joinStyle38);
style37.textContent = '.sale-step37[hidden],[data-save][hidden],.sheet button[hidden]{display:none!important}.sale-progress37{font-size:18px;font-weight:700;padding:10px 0;color:var(--pri)}.evidence37{margin:12px 0}.evidence37 .btn{margin:8px 0}.sale-slip37{max-width:740px;margin:auto}.sale-slip37 h2{line-height:1.5}.sale-slip37 .kv{overflow-wrap:anywhere}.sale-step37 .fields{margin-bottom:12px}@media(max-width:480px){.sale-step37 .field.half{width:100%;flex-basis:100%}.sale-progress37{font-size:18px}.sale-step37 .btn{min-height:48px}.sheet-f{flex-wrap:wrap}.sale-slip37{font-size:16px}}@media print{.sale-slip37 .photos{break-inside:avoid}.no-print{display:none!important}.sale-slip37{font-size:13pt;color:#000}}'; document.head.appendChild(style37);
