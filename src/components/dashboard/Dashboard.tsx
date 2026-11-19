'use client';

import styles from './Dashboard.module.css';
import { useMemo, useState } from 'react';
import { dateDisplay, money } from '@/lib/format';
import { calc } from '@/lib/billing';
import { Invoice, InventoryItem, InventoryTransaction, LedgerEntry, ProductionRecord, Product, Lead, AttendanceRecord, Worker, PurchaseRecord } from '@/types';

type Range = 'month' | 'year' | 'all';
type StatusFilter = 'all' | 'pending' | 'successful';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

type Props = {
  saved: Invoice[];
  products: Product[];
  ledgerEntries: LedgerEntry[];
  inventoryItems: InventoryItem[];
  inventoryTransactions: InventoryTransaction[];
  productions: ProductionRecord[];
  leads: Lead[];
  workers: Worker[];
  attendance: AttendanceRecord[];
  purchases: PurchaseRecord[];
  onNew: () => void;
  onOpen: (id: string) => void;
  onViewDebtors?: () => void;
};

function localDate(value: string) {
  const [y, m, d] = String(value || '').split('-').map(Number);
  if (!y || !m || !d) return new Date(value);
  return new Date(y, m - 1, d);
}

function inRange(invoice: Invoice, range: Range, year: number, month: string, fromDate: string, toDate: string, now = new Date()) {
  const d = localDate(invoice.meta.date);
  if (Number.isNaN(d.getTime())) return false;
  const key = invoice.meta.date;
  if (fromDate && key < fromDate) return false;
  if (toDate && key > toDate) return false;
  if (fromDate || toDate) return true;
  if (range === 'all' && month === '') return true;
  if (d.getFullYear() !== year) return false;
  if (month !== '' && d.getMonth() !== Number(month)) return false;
  if (month !== '') return true;
  if (range === 'year') return true;
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function shortMoney(value: number) {
  const n = Math.abs(value);
  if (n >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${Math.round(value)}`;
}

function monthSeries(invoices: Invoice[], products: Product[], selectedYear = new Date().getFullYear(), fromDate = '', toDate = '') {
  const now = new Date();
  const costMap = new Map(products.map(p => [p.id, p.costPrice]));
  return Array.from({ length: 12 }, (_, month) => {
    const date = new Date(selectedYear, month, 1);
    const rows = invoices.filter((invoice) => {
      const d = localDate(invoice.meta.date);
      return d.getFullYear() === selectedYear && d.getMonth() === month && (!fromDate || invoice.meta.date >= fromDate) && (!toDate || invoice.meta.date <= toDate);
    });
    const revenue = rows.reduce((sum, invoice) => sum + calc(invoice).grand, 0);
    const pending = rows.filter((invoice) => invoice.paymentStatus === 'Pending').reduce((sum, invoice) => sum + calc(invoice).grand, 0);
    const successful = rows.filter((invoice) => invoice.paymentStatus === 'Successful').reduce((sum, invoice) => sum + calc(invoice).grand, 0);
    // const profit = rows.reduce((sum, invoice) => sum + invoice.items.reduce((itemSum, item) => { const cost:any= costMap.get(item.productId); return itemSum + (typeof cost === 'number' && Number.isFinite(cost) ? (item.rate - cost) * Math.max(0, item.quantity) : 0); }, 0), 0);
  const profit = rows.reduce(
  (sum, invoice) =>
    sum +
    invoice.items.reduce((itemSum, item:any) => {
      const cost = costMap.get(item.productId);

      if (cost === undefined || !Number.isFinite(cost)) {
        return itemSum;
      }

      return (
        itemSum +
        (item.rate - cost) * Math.max(0, item.quantity)
      );
    }, 0),
  0
);
    return { label: date.toLocaleDateString('en-IN', { month: 'short' }), revenue, pending, successful, profit };
  });
}

function pointsFor(values: number[], width: number, height: number, pad = 18, max = Math.max(...values, 1)) {
  return values.map((value, index) => {
    const x = pad + (index * (width - pad * 2)) / Math.max(values.length - 1, 1);
    const y = height - pad - (value / max) * (height - pad * 2);
    return { x, y };
  });
}

function LineChart({ data }: { data: ReturnType<typeof monthSeries> }) {
  const width = 760;
  const height = 260;
  const maxValue = Math.max(...data.map((d) => d.revenue), 1);
  const revenue = pointsFor(data.map((d) => d.revenue), width, height, 18, maxValue);
  const successful = pointsFor(data.map((d) => d.successful), width, height, 18, maxValue);
  const path = (points: { x: number; y: number }[]) => points.map((p, i) => `${i ? 'L' : 'M'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const max = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <div className={styles.lineWrap}>
      <svg viewBox={`0 0 ${width} ${height}`} className={styles.lineChart} role="img" aria-label="Monthly revenue and successful payment trend">
        {[0, 1, 2, 3].map((row) => {
          const y = 18 + row * 74;
          return <line key={row} x1="18" x2="742" y1={y} y2={y} className={styles.gridLine} />;
        })}
        <path d={path(revenue)} className={styles.revenueLine} />
        <path d={path(successful)} className={styles.successLine} />
        {revenue.map((point, i) => <circle key={`r-${i}`} cx={point.x} cy={point.y} r="4" className={styles.revenueDot}><title>{data[i].label}: {shortMoney(data[i].revenue)}</title></circle>)}
        {successful.map((point, i) => <circle key={`s-${i}`} cx={point.x} cy={point.y} r="3" className={styles.successDot}><title>{data[i].label}: {shortMoney(data[i].successful)}</title></circle>)}
        {data.map((d, i) => <text key={d.label} x={revenue[i].x} y="250" textAnchor="middle" className={styles.axisText}>{d.label}</text>)}
      </svg>
      <div className={styles.chartLegend}>
        <span><i className={styles.legendRevenue} /> Invoiced {shortMoney(max)}</span>
        <span><i className={styles.legendSuccess} /> Successful payments</span>
      </div>
    </div>
  );
}

function ProfitChart({ data }: { data: ReturnType<typeof monthSeries> }) {
  const max = Math.max(...data.map((d) => Math.abs(d.profit)), 1);
  return <div className={styles.profitChart}>{data.map((d) => <div className={styles.profitCol} key={d.label}><div className={styles.profitValue}>{d.profit ? shortMoney(d.profit) : ''}</div><div className={styles.profitTrack}><i className={d.profit < 0 ? styles.lossBar : styles.profitBar} style={{ height: `${Math.max(d.profit ? 5 : 0, Math.abs(d.profit) / max * 100)}%` }} /></div><span>{d.label}</span></div>)}</div>;
}

function DonutChart({ successful, pending }: { successful: number; pending: number }) {
  const total = successful + pending;
  const successPct = total ? successful / total : 0;
  const circumference = 2 * Math.PI * 48;
  const dash = successPct * circumference;
  return (
    <div className={styles.donutBox}>
      <div className={styles.donutVisual}>
        <svg viewBox="0 0 120 120" className={styles.donut} role="img" aria-label="Successful versus pending invoice amount">
          <circle cx="60" cy="60" r="48" className={styles.donutTrack} />
          <circle cx="60" cy="60" r="48" className={styles.donutSuccess} strokeDasharray={`${dash} ${circumference - dash}`} />
        </svg>
        <div className={styles.donutCenter}><strong>{total ? `${Math.round(successPct * 100)}%` : '0%'}</strong><span>successful</span></div>
      </div>
      <div className={styles.donutLegend}>
        <div><span className={styles.successDotLegend} /><span>Successful</span><b>₹ {money(successful)}</b></div>
        <div><span className={styles.pendingDotLegend} /><span>Pending</span><b>₹ {money(pending)}</b></div>
      </div>
    </div>
  );
}



function leadMonthSeries(leads: Lead[], year: number) {
  return Array.from({ length: 12 }, (_, month) => ({
    label: MONTHS[month].slice(0, 3),
    count: leads.filter((lead) => {
      const d = localDate(lead.leadDate);
      return d.getFullYear() === year && d.getMonth() === month;
    }).length,
  }));
}

function LeadGrowthChart({ data }: { data: { label: string; count: number }[] }) {
  const width = 760;
  const height = 210;
  const max = Math.max(...data.map((x) => x.count), 1);
  const points = pointsFor(data.map((x) => x.count), width, height, 18, max);
  const path = points.map((p, i) => `${i ? "L" : "M"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  return (
    <div className={styles.leadChartWrap}>
      <svg viewBox={`0 0 ${width} ${height}`} className={styles.leadChart} role="img" aria-label="Monthly lead growth">
        {[0, 1, 2].map((row) => <line key={row} x1="18" x2="742" y1={20 + row * 70} y2={20 + row * 70} className={styles.gridLine} />)}
        <path d={path} className={styles.leadLine} />
        {points.map((point, i) => (
          <circle key={data[i].label} cx={point.x} cy={point.y} r="4" className={styles.leadDot}>
            <title>{data[i].label}: {data[i].count} leads</title>
          </circle>
        ))}
        {data.map((d, i) => <text key={d.label} x={points[i].x} y="202" textAnchor="middle" className={styles.axisText}>{d.label}</text>)}
      </svg>
    </div>
  );
}

function LeadSourceBars({ rows }: { rows: { source: string; count: number; won: number; value: number }[] }) {
  const max = Math.max(...rows.map((x) => x.count), 1);
  return (
    <div className={styles.leadSourceList}>
      {rows.slice(0, 7).map((row) => (
        <div className={styles.leadSourceRow} key={row.source}>
          <div className={styles.leadSourceTop}><b>{row.source}</b><span>{row.count} leads · {row.won} won · {Math.round(row.won / Math.max(row.count, 1) * 100)}% win rate</span></div>
          <div className={styles.leadSourceTrack}><i style={{ width: `${Math.max(4, row.count / max * 100)}%` }} /></div>
          <small>{row.value ? `${shortMoney(row.value)} estimated value` : "No value entered"}</small>
        </div>
      ))}
    </div>
  );
}

function inventoryStock(item: InventoryItem, transactions: InventoryTransaction[]) {
  return item.openingStock + transactions
    .filter((t) => t.itemId === item.id)
    .reduce((sum, t) => {
      if (t.transactionType === 'OUT') return sum - t.quantity;
      return sum + t.quantity;
    }, 0);
}

export function Dashboard({ saved, products, ledgerEntries, inventoryItems, inventoryTransactions, productions, leads, workers, attendance, purchases, onNew, onOpen, onViewDebtors }: Props) {
  const [range, setRange] = useState<Range>('month');
  const [status, setStatus] = useState<StatusFilter>('all');
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const receivableRows = useMemo(() => saved.map((invoice) => {
    const total = calc(invoice).grand;
    const receipts = ledgerEntries.filter((entry) => entry.invoiceId === invoice.id);
    const paid = invoice.paymentStatus === 'Successful' && receipts.length === 0
      ? total
      : receipts.reduce((sum, entry) => sum + Math.max(0, Number(entry.amount) || 0), 0);
    const due = invoice.paymentStatus === 'Successful' ? 0 : Math.max(0, total - paid);
    return { invoice, due, paid };
  }).filter((row) => row.due > 0.009), [saved, ledgerEntries]);
  const totalReceivables = receivableRows.reduce((sum, row) => sum + row.due, 0);
  const overdueReceivables = receivableRows.filter((row) => row.invoice.meta.date < todayKey).reduce((sum, row) => sum + row.due, 0);
  const debtorCount = new Set(receivableRows.map((row) => (row.invoice.buyer.name || row.invoice.consignee.name).trim().toLowerCase()).filter(Boolean)).size;
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth()));
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const years = useMemo(() => { const set = new Set(saved.map(x => localDate(x.meta.date).getFullYear()).filter(Boolean)); set.add(now.getFullYear()); return Array.from(set).sort((a,b)=>b-a); }, [saved]);

  const filtered = useMemo(() => saved.filter((invoice) => {
    if (!inRange(invoice, range, Number(year), month, fromDate, toDate, now)) return false;
    if (status === 'pending') return invoice.paymentStatus === 'Pending';
    if (status === 'successful') return invoice.paymentStatus === 'Successful';
    return true;
  }), [saved, range, status, year, month, fromDate, toDate]);

  const revenue = filtered.reduce((sum, invoice) => sum + calc(invoice).grand, 0);
  const pendingAmount = filtered.filter((invoice) => invoice.paymentStatus === 'Pending').reduce((sum, invoice) => sum + calc(invoice).grand, 0);
  const successfulAmount = filtered.filter((invoice) => invoice.paymentStatus === 'Successful').reduce((sum, invoice) => sum + calc(invoice).grand, 0);
  const filteredInvoiceIds = new Set(filtered.map((invoice) => invoice.id));
  const filteredLedger = ledgerEntries.filter((entry) => {
    if (status !== 'all' && entry.invoiceId && !filteredInvoiceIds.has(entry.invoiceId)) return false;
    if (status !== 'all' && !entry.invoiceId) return false;
    const key = entry.date || '';
    if (fromDate && key < fromDate) return false;
    if (toDate && key > toDate) return false;
    if (fromDate || toDate) return true;
    if (range === 'all' && month === '') return true;
    const d = localDate(key);
    if (d.getFullYear() !== Number(year)) return false;
    if (month !== '' && d.getMonth() !== Number(month)) return false;
    if (month !== '') return true;
    if (range === 'year') return true;
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const collected = filteredLedger.reduce((sum, entry) => sum + Math.max(0, entry.amount || 0), 0);
  const activeWorkers = workers.filter((worker) => worker.active);
  const todayAttendance = attendance.filter((record) => record.date === todayKey);
  const attendanceByWorker = new Map(todayAttendance.map((record) => [record.workerId, record]));
  const presentCount = activeWorkers.filter((worker) => ['PRESENT', 'HALF_DAY'].includes(attendanceByWorker.get(worker.id)?.status || '')).length;
  const absentCount = activeWorkers.filter((worker) => attendanceByWorker.get(worker.id)?.status === 'ABSENT').length;
  const notMarkedCount = activeWorkers.filter((worker) => !attendanceByWorker.has(worker.id)).length;
  const filteredPurchases = purchases.filter((purchase) => {
    const key = purchase.date || '';
    if (fromDate && key < fromDate) return false;
    if (toDate && key > toDate) return false;
    if (fromDate || toDate) return true;
    if (range === 'all' && month === '') return true;
    const d = localDate(key);
    if (d.getFullYear() !== Number(year)) return false;
    if (month !== '' && d.getMonth() !== Number(month)) return false;
    if (month !== '') return true;
    if (range === 'year') return true;
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const purchaseTotal = filteredPurchases.reduce((sum, purchase) => sum + Math.max(0, Number(purchase.totalAmount) || 0), 0);
  const purchasePaid = filteredPurchases.reduce((sum, purchase) => sum + Math.max(0, Number(purchase.paidAmount) || 0), 0);
  const purchaseDue = Math.max(0, purchaseTotal - purchasePaid);

  const months = useMemo(() => monthSeries(saved, products, Number(year), fromDate, toDate), [saved, products, year, fromDate, toDate]);
  const itemSales = useMemo(() => {
    const map = new Map<string, { quantity: number; amount: number }>();
    filtered.forEach((invoice) => invoice.items.forEach((item) => {
      const name = item.description.trim() || 'Unnamed item';
      const current = map.get(name) || { quantity: 0, amount: 0 };
      current.quantity += Math.max(0, item.quantity);
      current.amount += Math.max(0, item.quantity) * Math.max(0, item.rate);
      map.set(name, current);
    }));
    return Array.from(map.entries()).map(([name, value]) => ({ name, ...value })).sort((a, b) => b.amount - a.amount).slice(0, 6);
  }, [filtered]);

  const recent = [...filtered].sort((a, b) => localDate(b.meta.date).getTime() - localDate(a.meta.date).getTime()).slice(0, 7);
  const rangeLabel = fromDate || toDate ? `${fromDate || 'Start'} → ${toDate || 'Today'}` : month !== '' ? `${MONTHS[Number(month)]} ${year}` : range === 'month' ? 'This month' : range === 'year' ? `Year ${year}` : 'All time';
  const inventoryAlerts = useMemo(() => {
    return inventoryItems
      .filter((item) => item.active)
      .map((item) => ({ item, stock: inventoryStock(item, inventoryTransactions) }))
      .filter(({ item, stock }) => stock <= item.minStock)
      .sort((a, b) => (a.stock - a.item.minStock) - (b.stock - b.item.minStock));
  }, [inventoryItems, inventoryTransactions]);

  const rawReorder = inventoryAlerts.filter(({ item }) => item.type === 'RAW_MATERIAL');
  const productionNeeded = inventoryAlerts.filter(({ item }) => item.type === 'FINISHED_PRODUCT');
  const leadYear = Number(year) || new Date().getFullYear();
  const leadFiltered = useMemo(() => leads.filter((lead) => {
    const key = lead.leadDate;
    if (fromDate && key < fromDate) return false;
    if (toDate && key > toDate) return false;
    if (fromDate || toDate) return true;
    if (range === "all" && month === "") return true;
    const d = localDate(lead.leadDate);
    if (d.getFullYear() !== leadYear) return false;
    if (month !== "" && d.getMonth() !== Number(month)) return false;
    if (month !== "") return true;
    if (range === "year") return true;
    return d.getFullYear() === new Date().getFullYear() && d.getMonth() === new Date().getMonth();
  }), [leads, fromDate, toDate, range, month, leadYear]);

  const leadStats = useMemo(() => {
    const won = leadFiltered.filter((x) => x.status === "Won");
    const open = leadFiltered.filter((x) => !["Won", "Lost"].includes(x.status));
    const lost = leadFiltered.filter((x) => x.status === "Lost");
    const followups = leadFiltered.filter((x) => x.nextFollowUpDate && x.nextFollowUpDate < new Date().toISOString().slice(0, 10) && !["Won", "Lost"].includes(x.status));
    return {
      total: leadFiltered.length,
      won: won.length,
      lost: lost.length,
      open: open.length,
      conversion: leadFiltered.length ? Math.round(won.length / leadFiltered.length * 100) : 0,
      pipeline: open.reduce((sum, x) => sum + Math.max(0, x.estimatedValue || 0), 0),
      wonValue: won.reduce((sum, x) => sum + Math.max(0, x.estimatedValue || 0), 0),
      followups: followups.length,
      hot: leadFiltered.filter((x) => x.priority === 'Hot' && !['Won', 'Lost'].includes(x.status)).length,
      warm: leadFiltered.filter((x) => x.priority === 'Warm' && !['Won', 'Lost'].includes(x.status)).length,
      cold: leadFiltered.filter((x) => x.priority === 'Cold' && !['Won', 'Lost'].includes(x.status)).length,
    };
  }, [leadFiltered]);

  const leadSources = useMemo(() => {
    const map = new Map<string, { source: string; count: number; won: number; value: number }>();
    leadFiltered.forEach((lead) => {
      const key = lead.source || "Other";
      const current = map.get(key) || { source: key, count: 0, won: 0, value: 0 };
      current.count += 1;
      if (lead.status === "Won") current.won += 1;
      current.value += Math.max(0, lead.estimatedValue || 0);
      map.set(key, current);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [leadFiltered]);

  const leadStatuses = useMemo(() => {
    const order = ["New", "Contacted", "Qualified", "Follow-up", "Quoted", "Won", "Lost"];
    return order.map((status) => ({ status, count: leadFiltered.filter((x) => x.status === status).length }))
      .filter((x) => x.count > 0);
  }, [leadFiltered]);

  const leadMonths = useMemo(() => leadMonthSeries(leads, leadYear), [leads, leadYear]);

  const leadFollowups = useMemo(() => [...leadFiltered]
    .filter((x) => x.nextFollowUpDate && !["Won", "Lost"].includes(x.status))
    .sort((a, b) => a.nextFollowUpDate.localeCompare(b.nextFollowUpDate))
    .slice(0, 5), [leadFiltered]);


  const previousRevenue = useMemo(() => {
    if (range === 'all') return 0;
    const previous = new Date(now);
    if (range === 'month') previous.setMonth(previous.getMonth() - 1);
    else previous.setFullYear(previous.getFullYear() - 1);
    return saved.filter((invoice) => {
      const d = localDate(invoice.meta.date);
      return range === 'month' ? d.getFullYear() === previous.getFullYear() && d.getMonth() === previous.getMonth() : d.getFullYear() === previous.getFullYear();
    }).reduce((sum, invoice) => sum + calc(invoice).grand, 0);
  }, [saved, range, now]);
  const changePct = previousRevenue ? ((revenue - previousRevenue) / previousRevenue) * 100 : null;

  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <div>
          <div className={styles.eyebrow}>DEAL MAGSIL · BUSINESS OVERVIEW</div>
          <h1>Your billing, at a glance.</h1>
          <p>See revenue, collections, pending receivables and product performance without opening every bill.</p>
        </div>
        <button className={styles.primary} onClick={onNew}>＋ Create new bill</button>
      </div>

      <div className={styles.filterCard}>
        <div className={styles.filterHead}><div><span>ANALYTICS FILTERS</span><strong>{rangeLabel}</strong></div><button className={styles.clearButton} onClick={() => { setRange('month'); setYear(String(now.getFullYear())); setMonth(String(now.getMonth())); setFromDate(''); setToDate(''); setStatus('all'); }}>Reset</button></div>
        <div className={styles.filters}>
          <label><span>Period</span><select value={range} onChange={e => { const v=e.target.value as Range; setRange(v); if(v==='all') setMonth(''); }}><option value="month">Current month</option><option value="year">Full year</option><option value="all">All data</option></select></label>
          <label><span>Year</span><select value={year} onChange={e => setYear(e.target.value)}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select></label>
          <label><span>Month</span><select value={month} onChange={e => setMonth(e.target.value)}><option value="">All months</option>{MONTHS.map((m,i)=><option key={m} value={i}>{m}</option>)}</select></label>
          <label><span>From date</span><input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} /></label>
          <label><span>To date</span><input type="date" value={toDate} onChange={e=>setToDate(e.target.value)} /></label>
          <label><span>Status</span><select value={status} onChange={e=>setStatus(e.target.value as StatusFilter)}><option value="all">All status</option><option value="successful">Successful</option><option value="pending">Pending</option></select></label>
        </div>
      </div>

      <div className={styles.stats}>
        <Metric label="Invoiced" value={`₹ ${money(revenue)}`} note={changePct === null ? 'No prior period' : `${changePct >= 0 ? '+' : ''}${changePct.toFixed(1)}% vs prior period`} positive={changePct === null || changePct >= 0} />
        <Metric label="Collected" value={`₹ ${money(collected)}`} note="Ledger receipts" positive />
        <Metric label="Pending" value={`₹ ${money(pendingAmount)}`} note={`${filtered.filter(i => i.paymentStatus === 'Pending').length} unpaid bills`} />
        <Metric label="Successful" value={`₹ ${money(successfulAmount)}`} note={`${filtered.filter(i => i.paymentStatus === 'Successful').length} successful bills`} positive />
      </div>

      <section className={styles.inventoryAlerts}>
        <div className={styles.inventoryAlertHead}>
          <div>
            <span className={styles.kicker}>INVENTORY CONTROL</span>
            <h2>What needs attention?</h2>
            <p>Automatic alerts based on the Minimum / Reorder Stock you set in Inventory.</p>
          </div>
          <span className={styles.alertCount}>{rawReorder.length + productionNeeded.length} alerts</span>
        </div>

        <div className={styles.alertGrid}>
          <div className={styles.alertCard}>
            <div className={styles.alertCardHead}>
              <span className={styles.alertIcon}>↻</span>
              <div><strong>Reorder raw materials</strong><small>{rawReorder.length} item{rawReorder.length === 1 ? '' : 's'} below reorder level</small></div>
            </div>
            {rawReorder.length ? rawReorder.slice(0, 5).map(({ item, stock }) => (
              <div className={`${styles.alertRow} ${styles.lowStockRow}`} key={item.id}>
                <span><b>{item.name}</b><small>{item.category || 'Raw material'}</small></span>
                <strong className={styles.lowStockValue}>{stock.toFixed(2).replace(/\.00$/, '')} {item.unit}</strong>
                <em>Min {item.minStock} {item.unit}</em>
              </div>
            )) : <div className={styles.alertEmpty}>All raw materials are above their reorder level.</div>}
          </div>

          <div className={styles.alertCard}>
            <div className={styles.alertCardHead}>
              <span className={styles.alertIcon}>🏭</span>
              <div><strong>Production needed</strong><small>{productionNeeded.length} finished item{productionNeeded.length === 1 ? '' : 's'} at/below minimum</small></div>
            </div>
            {productionNeeded.length ? productionNeeded.slice(0, 5).map(({ item, stock }) => (
              <div className={`${styles.alertRow} ${styles.lowStockRow}`} key={item.id}>
                <span><b>{item.name}</b><small>{item.category || 'Finished product'}</small></span>
                <strong className={styles.lowStockValue}>{stock.toFixed(2).replace(/\.00$/, '')} {item.unit}</strong>
                <em>Target {item.minStock} {item.unit}</em>
              </div>
            )) : <div className={styles.alertEmpty}>No finished products currently need production.</div>}
          </div>
        </div>
      </section>

      <section className={styles.leadAnalytics}>
        <div className={styles.leadAnalyticsHead}>
          <div>
            <span className={styles.kicker}>MARKETING & SALES</span>
            <h2>Lead growth & conversion</h2>
            <p>Understand which channels bring enquiries, how they move through your pipeline and where follow-up is needed.</p>
          </div>
          <div className={styles.leadMiniStats}>
            <span><b>{leadStats.total}</b> leads</span>
            <span><b>{leadStats.conversion}%</b> conversion</span>
            <span><b>{shortMoney(leadStats.pipeline)}</b> open pipeline</span>
            <span className={styles.priorityHot}><b>{leadStats.hot}</b> hot</span><span className={styles.priorityWarm}><b>{leadStats.warm}</b> warm</span><span className={styles.priorityCold}><b>{leadStats.cold}</b> cold</span>
          </div>
        </div>

        <div className={styles.leadKpis}>
          <div><span>Total Leads</span><strong>{leadStats.total}</strong><small>Enquiries captured</small></div>
          <div><span>Open Pipeline</span><strong>{leadStats.open}</strong><small>{shortMoney(leadStats.pipeline)} estimated</small></div>
          <div><span>Won</span><strong>{leadStats.won}</strong><small>{shortMoney(leadStats.wonValue)} won value</small></div>
          <div><span>Follow-up Due</span><strong>{leadStats.followups}</strong><small>Open leads needing attention</small></div>
        </div>

        <div className={styles.priorityStrip} aria-label="Lead priority overview">
          <div className={styles.priorityHot}><span>🔥 Hot leads</span><strong>{leadStats.hot}</strong><small>Contact first — likely to convert</small></div>
          <div className={styles.priorityWarm}><span>☀️ Warm leads</span><strong>{leadStats.warm}</strong><small>Follow up and share quotation</small></div>
          <div className={styles.priorityCold}><span>❄️ Cold leads</span><strong>{leadStats.cold}</strong><small>Nurture with periodic updates</small></div>
        </div>

        <div className={styles.leadGrid}>
          <section className={styles.leadCard}>
            <div className={styles.cardHead}><div><span className={styles.kicker}>LEAD TREND</span><h2>Monthly enquiries</h2><p>Lead volume for {leadYear}.</p></div></div>
            {leads.length ? <LeadGrowthChart data={leadMonths} /> : <Empty text="Start adding leads to see growth." />}
          </section>

          <section className={styles.leadCard}>
            <div className={styles.cardHead}><div><span className={styles.kicker}>SOURCE PERFORMANCE</span><h2>Where leads come from</h2><p>Volume, won leads and estimated value.</p></div></div>
            {leadSources.length ? <LeadSourceBars rows={leadSources} /> : <Empty text="No lead sources yet." />}
          </section>

          <section className={styles.leadCard}>
            <div className={styles.cardHead}><div><span className={styles.kicker}>PIPELINE</span><h2>Lead status</h2><p>See where enquiries are getting stuck.</p></div></div>
            <div className={styles.statusFunnel}>
              {leadStatuses.length ? leadStatuses.map((row) => {
                const max = Math.max(...leadStatuses.map((x) => x.count), 1);
                return <div key={row.status}><span>{row.status}</span><div><i style={{ width: `${Math.max(5, row.count / max * 100)}%` }} /></div><b>{row.count}</b></div>;
              }) : <Empty text="No lead pipeline data yet." />}
            </div>
          </section>

          <section className={styles.leadCard}>
            <div className={styles.cardHead}><div><span className={styles.kicker}>FOLLOW-UP QUEUE</span><h2>Next actions</h2><p>Upcoming open leads, sorted by follow-up date.</p></div></div>
            {leadFollowups.length ? <div className={styles.followupList}>{leadFollowups.map((lead) => <div key={lead.id}><span><b>{lead.customerName}</b><small>{lead.source} · {lead.productInterest || lead.requirement}</small></span><em>{lead.nextFollowUpDate}</em></div>)}</div> : <Empty text="No follow-ups recorded for this period." />}
          </section>
        </div>
      </section>

      <div className={styles.dashboardSectionHeading}><span>01</span><div><b>Operations overview</b><small>Supplier purchases, payment exposure and today's workforce</small></div></div>
      <div className={styles.operationsGrid}>
        <section className={styles.card}>
          <div className={styles.cardHead}><div><span className={styles.kicker}>PURCHASE CONTROL · {rangeLabel}</span><h2>Supplier purchases</h2><p>Track spend, amount paid and outstanding supplier dues for the selected period.</p></div></div>
          <div className={styles.purchaseKpis}>
            <div><span>Total purchases</span><strong>{shortMoney(purchaseTotal)}</strong><small>{filteredPurchases.length} purchase records</small></div>
            <div><span>Paid to suppliers</span><strong>{shortMoney(purchasePaid)}</strong><small>Based on paid amount entered</small></div>
            <div className={purchaseDue > 0 ? styles.duePurchase : ''}><span>Supplier balance due</span><strong>{shortMoney(purchaseDue)}</strong><small>Prioritise due dates and supplier calls</small></div>
          </div>
          {filteredPurchases.length ? <div className={styles.purchaseList}>{[...filteredPurchases].sort((a,b) => b.date.localeCompare(a.date)).slice(0,5).map((purchase) => <div key={purchase.id}><span><b>{purchase.itemName}</b><small>{purchase.supplierName} · {purchase.date} · {purchase.quantity} {purchase.unit}</small></span><span><strong>{shortMoney(purchase.totalAmount)}</strong><small className={purchase.paymentStatus === 'Paid' ? styles.paidText : styles.dueText}>{purchase.paymentStatus} · due {shortMoney(Math.max(0, purchase.totalAmount - purchase.paidAmount))}</small></span></div>)}</div> : <Empty text="No purchase records match this period. Add supplier purchases to track material costs and outstanding dues." />}
        </section>
        <section className={styles.card}>
          <div className={styles.cardHead}><div><span className={styles.kicker}>WORKFORCE · TODAY</span><h2>Attendance snapshot</h2><p>Hover an absent employee to see the recorded reason/remarks.</p></div></div>
          <div className={styles.attendanceKpis}><div><span>Present / half-day</span><strong>{presentCount}</strong></div><div><span>Absent</span><strong className={styles.absentText}>{absentCount}</strong></div><div><span>Not marked</span><strong>{notMarkedCount}</strong></div></div>
          {activeWorkers.length ? <div className={styles.workerList}>{activeWorkers.map((worker) => {
            const record = attendanceByWorker.get(worker.id);
            const state = !record ? 'Not marked' : record.status === 'PRESENT' ? 'Present' : record.status === 'HALF_DAY' ? 'Half day' : record.status === 'ABSENT' ? 'Absent' : 'Leave';
            const reason = record?.remarks?.trim() || (record?.status === 'ABSENT' ? 'No reason recorded' : '');
            return <div key={worker.id} title={record?.status === 'ABSENT' ? `Absent reason: ${reason}` : `${state}${record?.remarks ? ` · ${record.remarks}` : ''}`}><span><b>{worker.name}</b><small>{worker.role || (worker.type === 'LABOUR' ? 'Labour' : 'Staff')}</small></span><span className={`${styles.attendanceBadge} ${record?.status === 'PRESENT' ? styles.attPresent : record?.status === 'HALF_DAY' ? styles.attHalf : record?.status === 'ABSENT' ? styles.attAbsent : record?.status === 'LEAVE' ? styles.attLeave : styles.attUnmarked}`}>{state}{record?.status === 'ABSENT' ? <i>ⓘ</i> : null}</span></div>;
          })}</div> : <Empty text="Add active workers in Attendance to see today's workforce here." />}
        </section>
      </div>

      <section className={styles.debtorOverview}>
        <div className={styles.debtorOverviewHead}>
          <div>
            <span className={styles.kicker}>CASH FLOW WATCH</span>
            <h2>Customer receivables</h2>
            <p>Money still to collect from customers across all unpaid invoices.</p>
          </div>
          <button type="button" onClick={onViewDebtors} className={styles.debtorOpenButton}>Manage debtors <span aria-hidden="true">→</span></button>
        </div>
        <div className={styles.debtorMetrics}>
          <div><span>Total outstanding</span><strong>{shortMoney(totalReceivables)}</strong><small>Remaining customer balances</small></div>
          <div><span>Customers owing</span><strong>{debtorCount}</strong><small>Unique customers with dues</small></div>
          <div className={styles.debtorWarning}><span>Older unpaid bills</span><strong>{shortMoney(overdueReceivables)}</strong><small>Invoices dated before today, not contractual due dates</small></div>
        </div>
        {receivableRows.length ? <div className={styles.debtorTopList}>
          <div className={styles.debtorListTitle}>Largest outstanding balances</div>
          {[...receivableRows].sort((a,b) => b.due - a.due).slice(0,4).map(({invoice, due}) => (
            <div key={invoice.id}>
              <span><b>{invoice.buyer.name || invoice.consignee.name || "Walk-in customer"}</b><small>{invoice.meta.invoiceNo} · {dateDisplay(invoice.meta.date)}</small></span>
              <strong>{shortMoney(due)}</strong>
            </div>
          ))}
        </div> : <div className={styles.debtorClear}>✓ All recorded invoices are fully paid. No outstanding customer balances.</div>}
      </section>

      <div className={styles.dashboardSectionHeading}><span>02</span><div><b>Billing & payment performance</b><small>Invoice totals, successful collections and outstanding receivables</small></div></div>
      <div className={styles.primaryGrid}>
        <section className={styles.card}>
          <div className={styles.cardHead}><div><span className={styles.kicker}>PERFORMANCE</span><h2>Revenue & collection</h2><p>Monthly invoice value compared with successful payments.</p></div><strong>₹ {money(revenue)}</strong></div>
          <LineChart data={months} />
        </section>
        <section className={styles.card}>
          <div className={styles.cardHead}><div><span className={styles.kicker}>RECEIVABLES</span><h2>Payment status</h2><p>Amount split, not just invoice count.</p></div></div>
          <DonutChart successful={successfulAmount} pending={pendingAmount} />
        </section>
      </div>

      <div className={styles.dashboardSectionHeading}><span>03</span><div><b>Sales & profitability insights</b><small>Product performance and estimated gross margin</small></div></div>
      <div className={styles.secondaryGrid}>
        <section className={styles.card}>
          <div className={styles.cardHead}><div><span className={styles.kicker}>PRODUCT MIX</span><h2>What is selling</h2><p>Top products by billed value for {rangeLabel.toLowerCase()}.</p></div></div>
          {itemSales.length ? <div className={styles.productBars}>{itemSales.map((item, index) => { const max = itemSales[0].amount || 1; return <div className={styles.productRow} key={item.name}><div><span>{index + 1}</span><b title={item.name}>{item.name}</b><em>{item.quantity} units</em></div><strong>₹ {money(item.amount)}</strong><div className={styles.barTrack}><i style={{ width: `${Math.max(4, item.amount / max * 100)}%` }} /></div></div>; })}</div> : <Empty text="No product sales in this period." />}
        </section>
        <section className={styles.card}>
          <div className={styles.cardHead}><div><span className={styles.kicker}>PROFIT / LOSS</span><h2>Monthly gross profit</h2><p>Sales value minus product cost. Taxes are excluded from margin.</p></div><strong>₹ {money(months.reduce((sum, m) => sum + m.profit, 0))}</strong></div>
          {products.some((p) => typeof p.costPrice === 'number' && p.costPrice > 0) ? <ProfitChart data={months} /> : <div className={styles.marginEmpty}><div>₹</div><strong>Add product cost prices</strong><span>Enter cost price in Product Master to unlock a true gross-profit / loss view. This prevents the dashboard from pretending revenue is profit.</span></div>}
        </section>
      </div>

      <div className={styles.dashboardSectionHeading}><span>04</span><div><b>Recent activity & quick insights</b><small>Latest bills and business health indicators</small></div></div>
      <div className={styles.bottomGrid}>
        <section className={styles.card}>
          <div className={styles.cardHead}><div><span className={styles.kicker}>ACTIVITY</span><h2>Recent bills</h2><p>Open any invoice directly.</p></div></div>
          {recent.length ? recent.map((invoice) => <button className={styles.recent} key={invoice.id} onClick={() => onOpen(invoice.id)}><span><b>{invoice.meta.invoiceNo}</b><small>{invoice.buyer.name || invoice.consignee.name || 'No customer'} · {dateDisplay(invoice.meta.date)}</small></span><span className={styles.recentRight}><strong>₹ {money(calc(invoice).grand)}</strong><i className={invoice.paymentStatus === 'Successful' ? styles.successBadge : styles.pendingBadge}>{invoice.paymentStatus}</i></span></button>) : <Empty text="No bills match this filter." />}
        </section>
        <section className={styles.card}>
          <div className={styles.cardHead}><div><span className={styles.kicker}>BILL REGISTER</span><h2>All bills in selected period</h2><p>{filtered.length} matching invoice(s), based on the filters above.</p></div><strong>{shortMoney(revenue)}</strong></div>
          {filtered.length ? <div className={styles.invoiceTableWrap}><table className={styles.invoiceTable}><thead><tr><th>Date / Invoice</th><th>Customer</th><th>Items / mode</th><th>Payment</th><th>Total</th><th /></tr></thead><tbody>{[...filtered].sort((a,b) => b.meta.date.localeCompare(a.meta.date)).map((invoice) => <tr key={invoice.id}><td><b>{dateDisplay(invoice.meta.date)}</b><small>{invoice.meta.invoiceNo}</small></td><td>{invoice.buyer.name || invoice.consignee.name || 'Walk-in customer'}</td><td>{invoice.items.length} line item(s)<small>{invoice.mode === 'GST' ? 'GST invoice' : 'Non-GST invoice'}</small></td><td><span className={invoice.paymentStatus === 'Successful' ? styles.invoicePaid : styles.invoicePending}>{invoice.paymentStatus}</span></td><td><b>{shortMoney(calc(invoice).grand)}</b></td><td><button className={styles.openInvoice} onClick={() => onOpen(invoice.id)}>Open</button></td></tr>)}</tbody></table></div> : <Empty text="No bills found for the selected date range and payment status." />}
        </section>
        <section className={styles.card}>
          <div className={styles.cardHead}><div><span className={styles.kicker}>QUICK INSIGHTS</span><h2>Business snapshot</h2><p>Useful signals from the data already in your billing system.</p></div></div>
          <div className={styles.insights}>
            <Insight label="Average bill" value={`₹ ${money(filtered.length ? revenue / filtered.length : 0)}`} />
            <Insight label="Collection ratio" value={`${revenue ? Math.round(collected / revenue * 100) : 0}%`} />
            <Insight label="Products active" value={products.filter(p => p.active).length} />
            <Insight label="Customers" value="From customer master" muted />
          </div>
        </section>
      </div>
    </section>
  );
}

function Metric({ label, value, note, positive }: { label: string; value: string; note: string; positive?: boolean }) {
  return <div className={styles.metric}><span>{label}</span><strong>{value}</strong><small className={positive ? styles.good : ''}>{note}</small></div>;
}

function Insight({ label, value, muted }: { label: string; value: string | number; muted?: boolean }) {
  return <div className={styles.insight}><span>{label}</span><strong className={muted ? styles.muted : ''}>{value}</strong></div>;
}

function Empty({ text }: { text: string }) { return <div className={styles.empty}>{text}</div>; }
