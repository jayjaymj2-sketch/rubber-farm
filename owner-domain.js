'use strict';
/* Shared accounting rules. This file is also embedded in Code.gs by tests/build.cjs. */
var Farm36 = (() => {
  const n = v => Number.isFinite(Number(v)) ? Number(v) : 0;
  const round = v => Math.round((n(v) + Number.EPSILON) * 100) / 100;
  const arr = v => { if (Array.isArray(v)) return v; try { const a = JSON.parse(v || '[]'); return Array.isArray(a) ? a : []; } catch (_) { return []; } };
  const yes = v => v === true || v === 'true' || v === 1 || v === '1';
  const live = r => r && !yes(r.deleted);
  const rows = (s, c) => Object.values(s[c] || {}).filter(live);
  const dateOK = v => { if (!/^\d{4}-\d{2}-\d{2}$/.test(v || '')) return false; const d = new Date(v + 'T00:00:00Z'); return !isNaN(d) && d.toISOString().slice(0, 10) === v; };
  function sale(r) {
    const weight = n(r.weight), drc = n(r.drc), dry = r.priceBasis === 'dry' && ['latex', 'cuplump'].includes(r.product);
    const payKg = dry ? weight * drc / 100 : weight, dryKg = drc > 0 ? weight * drc / 100 : ['usss', 'rss'].includes(r.product) ? weight : 0;
    const gross = round(payKg * n(r.price)), transport = n(r.transportCost), withheld = r.transportMethod === 'withheld';
    const afterDeduct = round(gross - n(r.deduct)), net = round(afterDeduct - (withheld ? transport : 0));
    const isShare = r.split === 'share', ownerPct = isShare ? Math.min(100, Math.max(0, n(r.ownerPct))) : 100;
    const base = round(afterDeduct - (isShare ? n(r.sharedCost) : 0) - (r.transportPayer === 'shared' ? transport : 0));
    const tapperTotal = isShare ? round(base * (100 - ownerPct) / 100) : 0;
    const ids = isShare ? arr(r.workerIds) : [], shares = typeof r.shares === 'string' ? JSON.parse(r.shares || '{}') : r.shares || {};
    const custom = r.shareMode === 'custom' && ids.length > 1;
    const weights = ids.map(id => custom && shares[id] !== undefined && shares[id] !== '' ? n(shares[id]) : 1), total = weights.reduce((a, b) => a + b, 0);
    const per = {}, pctOf = {}; let allocated = 0;
    ids.forEach((id, i) => { per[id] = total ? (i === ids.length - 1 ? round(tapperTotal - allocated) : round(tapperTotal * weights[i] / total)) : 0; allocated = round(allocated + per[id]); pctOf[id] = total ? round(weights[i] * 100 / total) : 0; });
    return { payKg: round(payKg), dryKg: round(dryKg), gross, net, base, ownerPct, tapperTotal, perTapper: ids.length ? round(tapperTotal / ids.length) : 0,
      per, pctOf, custom, ids, transport, ownerNet: round(net - tapperTotal), ownerAfterTransport: round(afterDeduct - tapperTotal - transport) };
  }
  function settlementRows(s, kind, parent, cutoff = '9999-12-31') {
    const explicit = rows(s, 'settlements').filter(x => x.kind === kind && (kind === 'expense' ? x.expenseId : x.saleId) === parent.id);
    if (explicit.length || yes(parent.installments)) return explicit.filter(x => x.date <= cutoff);
    // Legacy all-or-nothing records remain intact until the user deliberately switches to installments.
    const settled = kind === 'receive' ? yes(parent.received) : kind === 'expense' ? parent.paid !== false && parent.paid !== 'false' : false;
    const date = (kind === 'receive' ? parent.receivedDate : parent.paidDate) || parent.date;
    if (!settled || date > cutoff) return [];
    return [{ id: 'legacy:' + parent.id, kind, date, amount: kind === 'receive' ? sale(parent).net : n(parent.amount), estimated: !(kind === 'receive' ? parent.receivedDate : parent.paidDate) }];
  }
  const totalSettled = (s, kind, parent, cutoff) => round(settlementRows(s, kind, parent, cutoff).reduce((a, x) => a + n(x.amount), 0));
  const outstanding = (s, kind, parent, cutoff) => round(Math.max(0, (kind === 'receive' ? sale(parent).net : kind === 'transport' ? n(parent.transportCost) : n(parent.amount)) - totalSettled(s, kind, parent, cutoff)));
  function lot(s, r, excludeSale = '') {
    const used = rows(s, 'sales').filter(x => x.id !== excludeSale).reduce((a, x) => a + arr(x.lotAllocations).filter(q => q.lotId === r.id).reduce((b, q) => b + n(q.kg), 0), 0);
    return { stored: round(n(r.weight) - n(r.lossKg)), used: round(used), available: round(n(r.weight) - n(r.lossKg) - used) };
  }
  const farm = (s, r) => r && (r.farmId || (s.plots || {})[r.plotId]?.farmId || (rows(s, 'farms').length === 1 ? rows(s, 'farms')[0].id : ''));
  function error(s, coll, r, old) {
    const deleting = !live(r);
    if (['sales', 'expenses'].includes(coll)) {
      const kinds = coll === 'sales' ? ['receive', 'transport'] : ['expense'];
      if (deleting && rows(s, 'settlements').some(x => kinds.includes(x.kind) && (coll === 'sales' ? x.saleId : x.expenseId) === r.id)) return 'รายการนี้มีประวัติรับ/จ่าย ให้ยกเลิกรายการเงินที่เกี่ยวข้องก่อนลบ';
      if (!deleting && rows(s, 'settlements').some(x => kinds.includes(x.kind) && (coll === 'sales' ? x.saleId : x.expenseId) === r.id && (x.date < r.date || farm(s, x) !== farm(s, r)))) return 'วันที่หรือสวนไม่ตรงกับประวัติรับ/จ่าย';
      if (!deleting) for (const kind of kinds) {
        if (kind === 'transport' && r.transportMethod === 'withheld' && totalSettled(s, kind, r)) return 'มีประวัติจ่ายค่ารถแล้ว จึงเปลี่ยนเป็นผู้ซื้อหักค่ารถไม่ได้';
        const maximum = kind === 'receive' ? sale(r).net : kind === 'transport' ? n(r.transportCost) : n(r.amount);
        if (rows(s, 'settlements').some(x => x.kind === kind && (coll === 'sales' ? x.saleId : x.expenseId) === r.id) && totalSettled(s, kind, r) > maximum + .001) return 'ยอดใหม่ต่ำกว่าเงินที่รับ/จ่ายไปแล้ว';
      }
    }
    if (coll === 'sales' && !deleting) {
      if (!(n(r.weight) > 0 && n(r.price) > 0) || !Number.isFinite(Number(r.weight)) || !Number.isFinite(Number(r.price))) return 'น้ำหนักและราคาต้องมากกว่า 0';
      if (r.priceBasis === 'dry' && ['latex', 'cuplump'].includes(r.product) && !(n(r.drc) > 0 && n(r.drc) <= 100)) return 'กรุณาระบุ DRC มากกว่า 0 และไม่เกิน 100';
      if (r.split === 'share' && (!arr(r.workerIds).length || new Set(arr(r.workerIds)).size !== arr(r.workerIds).length)) return 'เลือกคนกรีดโดยไม่ซ้ำกัน';
      if (r.split === 'share' && !(Number(r.ownerPct) >= 0 && Number(r.ownerPct) <= 100)) return 'สัดส่วนเจ้าของไม่ถูกต้อง';
      if ([r.deduct, r.sharedCost, r.transportCost].some(x => x != null && x !== '' && (!Number.isFinite(Number(x)) || Number(x) < 0))) return 'ค่าหักและค่ารถต้องเป็นจำนวนที่ไม่ติดลบ';
      if (n(r.transportCost) && (!['owner', 'shared'].includes(r.transportPayer) || !['separate', 'withheld'].includes(r.transportMethod))) return 'เลือกผู้รับผิดชอบและวิธีจ่ายค่ารถ';
      if (sale(r).base < 0 || sale(r).net < 0) return 'ค่าหักมากกว่ายอดขาย';
      if (r.split === 'share' && r.shareMode === 'custom' && arr(r.workerIds).length > 1) {
        let shares = r.shares; if (typeof shares === 'string') { try { shares = JSON.parse(shares); } catch (_) { return 'สัดส่วนคนกรีดไม่ถูกต้อง'; } }
        if (arr(r.workerIds).some(id => n(shares?.[id]) < 0) || Math.abs(arr(r.workerIds).reduce((a, id) => a + n(shares?.[id]), 0) - 100) > .01) return 'สัดส่วนคนกรีดต้องรวมเป็น 100%';
      }
      const allocations = arr(r.lotAllocations);
      if (allocations.length) {
        if (new Set(allocations.map(x => x.lotId)).size !== allocations.length || Math.abs(allocations.reduce((a, x) => a + n(x.kg), 0) - n(r.weight)) > .01) return 'น้ำหนักที่ตัดจากล็อตต้องรวมเท่ากับน้ำหนักขาย';
        for (const q of allocations) {
          const l = (s.rubberlots || {})[q.lotId];
          if (!live(l) || l.product !== r.product || farm(s, l) !== farm(s, r) || l.date > r.date || !(n(q.kg) > 0) || n(q.kg) > lot(s, l, r.id).available + .001) return 'ล็อตไม่ตรงชนิด/สวน/วันที่ หรือยางในล็อตไม่พอ';
        }
      }
    }
    if (coll === 'settlements' && !deleting) {
      if (!['receive', 'expense', 'transport'].includes(r.kind) || !(Number(r.amount) > 0) || !Number.isFinite(Number(r.amount)) || !dateOK(r.date)) return 'กรอกประเภท วันที่ และจำนวนเงินที่ถูกต้อง';
      const p = (s[r.kind === 'expense' ? 'expenses' : 'sales'] || {})[r.kind === 'expense' ? r.expenseId : r.saleId];
      if (!live(p)) return 'ไม่พบรายการต้นทาง';
      if (!yes(p.installments) && r.kind !== 'transport' && !rows(s, 'settlements').some(x => x.kind === r.kind && (r.kind === 'expense' ? x.expenseId : x.saleId) === p.id) && settlementRows(s, r.kind, p).length) return 'ให้เปิดการรับ/จ่ายเป็นงวดที่รายการต้นทางก่อน';
      if (r.date < p.date || farm(s, r) !== farm(s, p)) return 'วันรับ/จ่ายต้องไม่ก่อนรายการต้นทาง และต้องเป็นสวนเดียวกัน';
      if (r.kind === 'transport' && p.transportMethod !== 'separate') return 'ผู้ซื้อหักค่ารถแล้ว ไม่ต้องบันทึกจ่ายซ้ำ';
      const max = r.kind === 'receive' ? sale(p).net : r.kind === 'expense' ? n(p.amount) : n(p.transportCost);
      const already = rows(s, 'settlements').filter(x => x.id !== r.id && x.kind === r.kind && (r.kind === 'expense' ? x.expenseId === p.id : x.saleId === p.id)).reduce((a, x) => a + n(x.amount), 0);
      if (already + n(r.amount) > max + .001) return 'ยอดรับ/จ่ายรวมเกินยอดที่ต้องชำระ';
    }
    if (coll === 'rubberlots') {
      if (deleting && rows(s, 'sales').some(x => arr(x.lotAllocations).some(q => q.lotId === r.id))) return 'ล็อตนี้ถูกขายแล้ว ให้แก้รายการขายก่อนลบล็อต';
      if (!deleting) {
        if (!(n(r.weight) > 0) || !Number.isFinite(Number(r.weight)) || !(n(r.lossKg) >= 0 && n(r.lossKg) <= n(r.weight)) || lot(s, r).available < -.001 || !dateOK(r.date)) return 'น้ำหนักล็อต/น้ำหนักลดไม่ถูกต้อง หรือต่ำกว่ายอดขายแล้ว';
        const sales = rows(s, 'sales').filter(x => arr(x.lotAllocations).some(q => q.lotId === r.id));
        if (sales.some(x => x.product !== r.product || farm(s, x) !== farm(s, r) || x.date < r.date)) return 'ชนิด สวน หรือวันรับล็อตไม่ตรงกับรายการขาย';
        for (const id of arr(r.tappingIds)) {
          const t = (s.tapping || {})[id];
          if (!live(t) || t.product !== r.product || farm(s, t) !== farm(s, r) || t.date > r.date || rows(s, 'rubberlots').some(l => l.id !== r.id && arr(l.tappingIds).includes(id))) return 'บันทึกกรีดไม่ตรงล็อต หรือใช้ในล็อตอื่นแล้ว';
        }
      }
    }
    if (coll === 'budgets' && !deleting && (!/^\d{4}-(0[1-9]|1[0-2])$/.test(r.month || '') || [r.expenseLimit, r.targetKg].some(v => !Number.isFinite(Number(v)) || Number(v) < 0))) return 'เดือน งบประมาณ หรือเป้าหมายไม่ถูกต้อง';
    if (coll === 'tasks' && !deleting && (!String(r.title || '').trim() || !dateOK(r.date) || !['todo', 'doing', 'done'].includes(r.status))) return 'กรอกชื่องาน วันกำหนดเสร็จ และสถานะ';
    if (coll === 'healthchecks' && !deleting && (!live((s.health || {})[r.healthId]) || !dateOK(r.date) || !['better', 'same', 'worse', 'recovered'].includes(r.result))) return 'เลือกกรณีต้นยาง วันที่ และผลติดตาม';
    if (coll === 'healthchecks' && !deleting && (r.date < s.health[r.healthId].date || farm(s, r) !== farm(s, s.health[r.healthId]))) return 'วันติดตามหรือสวนไม่ตรงกับกรณีต้นยาง';
    if (coll === 'health' && deleting && rows(s, 'healthchecks').some(x => x.healthId === r.id)) return 'มีประวัติติดตามกรณีนี้ ให้ลบรายการติดตามก่อน';
    return '';
  }
  function similarSales(s, r) {
    const name = value => String(value || '').normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
    return rows(s, 'sales').filter(x => x.id !== r.id && x.date === r.date && farm(s, x) === farm(s, r) && name(x.buyer) === name(r.buyer) && x.product === r.product && Math.abs(n(x.weight) - n(r.weight)) < .001 && Math.abs(sale(x).gross - sale(r).gross) < .01);
  }
  // Payments are farm-specific credits against the oldest claims, including wages.
  // This is an allocation for reporting, never a replacement for payment evidence.
  function workerAllocation(s, cutoff = '9999-12-31', farmId = 'all') {
    const groups = {}, bySale = {};
    const belongs = r => r.date <= cutoff && (farmId === 'all' || farm(s, r) === farmId);
    const group = (workerId, r) => groups[JSON.stringify([workerId, farm(s, r)])] ||= { workerId, farmId: farm(s, r), claims: [], credits: 0 };
    rows(s, 'sales').filter(belongs).forEach(r => {
      const c = sale(r); bySale[r.id] = { earned: c.tapperTotal, settled: 0, remaining: 0, workers: {} };
      c.ids.forEach(id => group(id, r).claims.push({ saleId: r.id, id: r.id, date: r.date, at: n(r.createdAt), amount: c.per[id] }));
    });
    rows(s, 'worklogs').filter(belongs).forEach(r => group(r.workerId, r).claims.push({ id: r.id, date: r.date, at: n(r.createdAt), amount: Math.max(0, round(n(r.days) * n(r.wage))) }));
    rows(s, 'payments').filter(belongs).forEach(r => {
      const g = group(r.workerId, r);
      if (r.type === 'adjust' && n(r.amount) > 0) g.claims.push({ id: r.id, date: r.date, at: n(r.createdAt), amount: n(r.amount) });
      else g.credits += r.type === 'adjust' ? -n(r.amount) : n(r.amount);
    });
    Object.values(groups).forEach(g => {
      let credit = Math.max(0, round(g.credits));
      g.claims.sort((a, b) => a.date.localeCompare(b.date) || a.at - b.at || String(a.id).localeCompare(String(b.id)));
      g.claims.forEach(claim => {
        const paid = round(Math.min(claim.amount, credit)); credit = round(credit - paid);
        if (!claim.saleId) return;
        const result = bySale[claim.saleId], remaining = round(claim.amount - paid);
        result.workers[g.workerId] = { earned: claim.amount, settled: paid, remaining };
        result.settled = round(result.settled + paid); result.remaining = round(result.remaining + remaining);
      });
    });
    return bySale;
  }
  function cashOwnership(s, cashNet, cutoff, farmId = 'all') {
    const allocation = workerAllocation(s, cutoff, farmId), groups = {};
    rows(s, 'sales').filter(r => r.date <= cutoff && (farmId === 'all' || farm(s, r) === farmId)).forEach(r => {
      const c = sale(r), received = Math.min(c.net, totalSettled(s, 'receive', r, cutoff));
      c.ids.forEach(id => {
        const key = JSON.stringify([id, farm(s, r)]), g = groups[key] ||= { received: 0, settled: 0, remaining: 0 };
        g.received += c.net > 0 ? c.per[id] * received / c.net : 0;
        g.settled += allocation[r.id]?.workers[id]?.settled || 0; g.remaining += allocation[r.id]?.workers[id]?.remaining || 0;
      });
    });
    const workerReserve = round(Object.values(groups).reduce((total, g) => total + Math.max(0, Math.min(g.remaining, g.received - g.settled)), 0));
    return { cashNet: round(cashNet), workerReserve, ownerCash: round(cashNet - workerReserve), shortfall: round(Math.max(0, workerReserve - cashNet)) };
  }
  function filterSales(s, sales, options, cutoff = '9999-12-31') {
    const allocation = workerAllocation(s, cutoff, options.farmId || 'all');
    const query = String(options.query || '').normalize('NFC').trim().toLowerCase();
    return sales.filter(r => {
      if (options.workerId && !arr(r.workerIds).includes(options.workerId)) return false;
      const searchable = [r.buyer, r.date, r.lotNo, (s.plots || {})[r.plotId]?.name, ...arr(r.workerIds).map(id => (s.workers || {})[id]?.name)].join(' ').normalize('NFC').toLowerCase();
      if (query && !searchable.includes(query)) return false;
      const owed = outstanding(s, 'receive', r, cutoff), workerOwed = allocation[r.id]?.remaining ?? sale(r).tapperTotal;
      return !options.status || options.status === 'receive' && owed > 0 || options.status === 'received' && owed <= 0 || options.status === 'worker' && workerOwed > 0 || options.status === 'workerPaid' && sale(r).tapperTotal > 0 && workerOwed <= 0;
    });
  }
  function buyers(s, from, to, farmId = 'all') {
    const groups = {};
    rows(s, 'sales').filter(r => r.date >= from && r.date <= to && (farmId === 'all' || farm(s, r) === farmId)).forEach(r => {
      const c = sale(r), key = (r.buyer || 'ไม่ระบุร้าน') + '|' + r.product;
      const g = groups[key] ||= { buyer: r.buyer || 'ไม่ระบุร้าน', product: r.product, count: 0, kg: 0, dryKg: 0, net: 0, owner: 0, unknownDRC: 0, debt: 0 };
      g.count++; g.kg += n(r.weight); g.owner += c.ownerAfterTransport; g.debt += outstanding(s, 'receive', r);
      if (c.dryKg > 0) { g.dryKg += c.dryKg; g.net += c.gross - n(r.deduct) - n(r.transportCost); } else g.unknownDRC++;
    });
    return Object.values(groups).map(g => ({ ...g, netPerDryKg: g.dryKg ? round(g.net / g.dryKg) : null })).sort((a, b) => a.product.localeCompare(b.product) || n(b.netPerDryKg) - n(a.netPerDryKg));
  }
  function access(s, user, coll, rec, write = false) {
    if (write && coll === 'auditlog') return false;
    if (user.role === 'owner') return true;
    if (write && user.role !== 'editor') return false;
    const allowed = user[write ? 'writeColls' : 'readColls'];
    if (allowed !== undefined && !arr(allowed).includes(coll)) return false;
    const farms = arr(user.farmIds), plots = arr(user.plotIds);
    if (!farms.length && !plots.length) return true;
    let r = rec;
    if (coll === 'settlements') r = (s[rec.kind === 'expense' ? 'expenses' : 'sales'] || {})[rec.kind === 'expense' ? rec.expenseId : rec.saleId];
    if (coll === 'healthchecks') r = (s.health || {})[rec.healthId];
    if (coll === 'auditlog') return !write && access(s, user, rec.coll, (s[rec.coll] || {})[rec.recId] || { farmId: rec.farmId, plotId: rec.plotId });
    if (!r) return false;
    if (coll === 'farms') return !write && (!farms.length || farms.includes(rec.id)) && (!plots.length || plots.some(id => (s.plots || {})[id]?.farmId === rec.id));
    if (coll === 'workers') return !write && arr(rec.plotIds).some(id => (!plots.length || plots.includes(id)) && (!farms.length || farms.includes((s.plots || {})[id]?.farmId)));
    const farmId = farm(s, r), plotId = coll === 'plots' ? r.id : r.plotId;
    return (!farms.length || farms.includes(farmId)) && (!plots.length || plots.includes(plotId));
  }
  return { n, round, arr, yes, live, rows, dateOK, sale, settlementRows, totalSettled, outstanding, lot, farm, error, buyers, access, similarSales, workerAllocation, cashOwnership, filterSales };
})();
