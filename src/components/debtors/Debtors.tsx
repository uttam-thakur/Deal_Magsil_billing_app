"use client";

import { useMemo, useState } from "react";
import styles from "./Debtors.module.css";
import { calc } from "@/lib/billing";
import { dateDisplay, money } from "@/lib/format";
import { Customer, Invoice, LedgerEntry, LedgerPaymentMode } from "@/types";

type Props = {
  invoices: Invoice[];
  customers: Customer[];
  entries: LedgerEntry[];
  onSaveEntry: (entry: LedgerEntry) => Promise<void>;
};

type DueInvoice = {
  invoice: Invoice;
  customerName: string;
  total: number;
  paid: number;
  due: number;
};

const modes: LedgerPaymentMode[] = ["Cash", "UPI", "Bank", "Cheque", "Other"];

function partyName(invoice: Invoice) {
  return (invoice.buyer.name.trim() ? invoice.buyer.name : invoice.consignee.name).trim() || "Walk-in customer";
}

export function Debtors({ invoices, customers, entries, onSaveEntry }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "overdue" | "partial" | "unpaid" | "paid">("all");
  const [selected, setSelected] = useState<DueInvoice | null>(null);
  const [selectedManual, setSelectedManual] = useState<LedgerEntry | null>(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<LedgerPaymentMode>("Cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [editingManualId, setEditingManualId] = useState<string | null>(null);
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualDate, setManualDate] = useState(new Date().toISOString().slice(0, 10));
  const [manualAmount, setManualAmount] = useState("");
  const [manualReference, setManualReference] = useState("");
  const [manualNotes, setManualNotes] = useState("");

  const today = new Date().toISOString().slice(0, 10);

  const dueInvoices = useMemo<DueInvoice[]>(() => invoices.map((invoice) => {
    const total = calc(invoice).grand;
    const receipts = entries.filter((entry) => entry.invoiceId === invoice.id);
    const paid = invoice.paymentStatus === "Successful" && receipts.length === 0
      ? total
      : receipts.reduce((sum, entry) => sum + Math.max(0, Number(entry.amount) || 0), 0);
    const due = invoice.paymentStatus === "Successful" ? 0 : Math.max(0, total - paid);
    return { invoice, customerName: partyName(invoice), total, paid: Math.min(total, paid), due };
  }).filter((row) => row.due > 0.009).sort((a, b) => a.invoice.meta.date.localeCompare(b.invoice.meta.date)), [invoices, entries]);

  const filtered = dueInvoices.filter((row) => {
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || `${row.customerName} ${row.invoice.meta.invoiceNo} ${row.invoice.buyer.contact} ${row.invoice.consignee.contact}`.toLowerCase().includes(term);
    const matchesFilter = filter === "all" ||
      (filter === "overdue" && row.invoice.meta.date < today) ||
      (filter === "partial" && row.paid > 0);
    return matchesSearch && matchesFilter;
  });

  const manualDues = entries.filter((entry) => entry.type === "Manual Due");
  const manualBalance = (entry: LedgerEntry) => {
    const received = entries.filter((receipt) => receipt.type === "Receipt" && receipt.invoiceId === `manual:${entry.id}`)
      .reduce((sum, receipt) => sum + Math.max(0, Number(receipt.amount) || 0), 0);
    const principal = Math.max(0, Number(entry.amount) || 0);
    return { principal, received: Math.min(principal, received), due: Math.max(0, principal - received) };
  };
  const manualDueTotal = manualDues.reduce((sum, entry) => sum + manualBalance(entry).due, 0);
  const totalDue = dueInvoices.reduce((sum, row) => sum + row.due, 0) + manualDueTotal;
  const totalPaidAgainstOpen = dueInvoices.reduce((sum, row) => sum + row.paid, 0);
  const customersOwing = new Set([...dueInvoices.map((row) => row.customerName.toLowerCase()), ...manualDues.filter((entry) => manualBalance(entry).due > 0.009).map((entry) => entry.customerName.toLowerCase())]).size;
  const overdueRows = dueInvoices.filter((row) => row.invoice.meta.date < today);
  const overdueAmount = overdueRows.reduce((sum, row) => sum + row.due, 0);

  const resetPayment = () => {
    setSelected(null);
    setSelectedManual(null);
    setAmount("");
    setDate(today);
    setMode("Cash");
    setReference("");
    setNotes("");
  };

  const saveManualDue = async () => {
    const value = Number(manualAmount);
    if (!manualName.trim() || !Number.isFinite(value) || value <= 0 || !manualDate) return;
    setSaving(true);
    try {
      await onSaveEntry({
        id: editingManualId || crypto.randomUUID(), date: manualDate, type: "Manual Due",
        customerId: manualPhone.trim(), customerName: manualName.trim(),
        invoiceId: "", invoiceNo: manualReference.trim() || "Manual entry",
        amount: Math.round(value * 100) / 100, paymentMode: "Other",
        reference: manualReference.trim(), notes: [manualPhone.trim() ? `Phone: ${manualPhone.trim()}` : "", manualNotes.trim()].filter(Boolean).join(" | "),
        createdAt: new Date().toISOString(),
      });
      setManualOpen(false); setEditingManualId(null); setManualName(""); setManualPhone(""); setManualDate(today); setManualAmount(""); setManualReference(""); setManualNotes("");
    } finally { setSaving(false); }
  };

  const savePayment = async () => {
    if ((!selected && !selectedManual) || !Number.isFinite(Number(amount)) || Number(amount) <= 0) return;
    const currentDue = selected ? selected.due : selectedManual ? manualBalance(selectedManual).due : 0;
    if (Number(amount) > currentDue + 0.009) return;
    setSaving(true);
    try {
      const party = selected ? selected.customerName : selectedManual!.customerName;
      const customer = customers.find((item) => item.name.trim().toLowerCase() === party.toLowerCase());
      await onSaveEntry({
        id: crypto.randomUUID(),
        date,
        type: "Receipt",
        customerId: selectedManual?.customerId || customer?.id || "",
        customerName: party,
        invoiceId: selected ? selected.invoice.id : `manual:${selectedManual!.id}`,
        invoiceNo: selected ? selected.invoice.meta.invoiceNo : `Manual: ${selectedManual!.reference || selectedManual!.id}`,
        amount: Math.round(Number(amount) * 100) / 100,
        paymentMode: mode,
        reference: reference.trim(),
        notes: notes.trim(),
        createdAt: new Date().toISOString(),
      });
      resetPayment();
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>ACCOUNTS RECEIVABLE</p>
          <h1>Debtors & Collections</h1>
          <p>Track outstanding customer balances, record part-payments and see exactly what is still to be collected.</p>
        </div>
        <div className={styles.heroMark} aria-hidden="true">₹</div>
      </header>

      <section className={styles.metrics} aria-label="Debtor summary">
        <article className={styles.metricCard}>
          <span>Total outstanding</span>
          <strong>₹ {money(totalDue)}</strong>
          <small>Outstanding invoice balances plus manually recorded dues</small>
        </article>
        <article className={styles.metricCard}>
          <span>Customers owing</span>
          <strong>{customersOwing}</strong>
          <small>Customers with an outstanding balance</small>
        </article>
        <article className={`${styles.metricCard} ${styles.overdueMetric}`}>
          <span>Overdue invoice balance</span>
          <strong>₹ {money(overdueAmount)}</strong>
          <small>{overdueRows.length} invoice(s) dated before today</small>
        </article>
        <article className={styles.metricCard}>
          <span>Already paid on open bills</span>
          <strong>₹ {money(totalPaidAgainstOpen)}</strong>
          <small>Receipts allocated to invoices still due</small>
        </article>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Outstanding invoices</h2>
            <p>Record every collection with date, mode and reference for a clear payment history.</p>
          </div>
          <div className={styles.headerActions}>
            <button type="button" className={styles.manualButton} onClick={() => { setEditingManualId(null); setManualName(""); setManualPhone(""); setManualDate(today); setManualAmount(""); setManualReference(""); setManualNotes(""); setManualOpen(true); }}>+ Add manual debtor</button>
            <span className={styles.count}>{filtered.length + manualDues.length} records</span>
          </div>
        </div>

        <div className={styles.filters}>
          <label className={styles.search}>
            <span>Search debtors</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Customer, invoice or phone" />
          </label>
          <label>
            <span>Show</span>
            <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
              <option value="all">All outstanding</option>
              <option value="overdue">Overdue invoices</option>
              <option value="partial">Partially paid</option>
              <option value="unpaid">Unpaid / full due</option>
              <option value="paid">Paid</option>
            </select>
          </label>
        </div>

        {filtered.length === 0 ? (
          <div className={styles.empty}>
            <div>✓</div>
            <h3>No outstanding invoices found</h3>
            <p>Try changing the search/filter, or your customers may be fully paid up.</p>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Customer / Invoice</th>
                  <th>Bill date</th>
                  <th className={styles.moneyCell}>Bill total</th>
                  <th className={styles.moneyCell}>Received</th>
                  <th className={styles.moneyCell}>Balance due</th>
                  <th>Collection status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const overdue = row.invoice.meta.date < today;
                  return (
                    <tr key={row.invoice.id}>
                      <td>
                        <strong className={styles.customer}>{row.customerName}</strong>
                        <small className={styles.invoiceNo}>{row.invoice.meta.invoiceNo}</small>
                      </td>
                      <td>{dateDisplay(row.invoice.meta.date)}</td>
                      <td className={styles.moneyCell}>₹ {money(row.total)}</td>
                      <td className={styles.moneyCell}>₹ {money(row.paid)}</td>
                      <td className={`${styles.moneyCell} ${styles.dueAmount}`}>₹ {money(row.due)}</td>
                      <td>
                        <span className={`${styles.status} ${overdue ? styles.overdue : row.paid > 0 ? styles.partial : styles.pending}`}>
                          <i />{overdue ? "Overdue" : row.paid > 0 ? "Part-paid" : "Unpaid"}
                        </span>
                      </td>
                      <td>
                        <button type="button" className={styles.collectButton} onClick={() => { setSelected(row); setAmount(String(Math.round(row.due * 100) / 100)); setDate(today); setMode("Cash"); setReference(""); setNotes(""); }}>
                          + Record payment
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {manualDues.length > 0 && <section className={styles.panel}>
        <div className={styles.panelHeader}><div><h2>Manual debtor records</h2><p>Outstanding amounts added manually without creating a bill.</p></div><span className={styles.count}>{manualDues.length} records</span></div>
        <div className={styles.tableWrap}><table><thead><tr><th>Customer</th><th>Entry date</th><th>Reference</th><th className={styles.moneyCell}>Original due</th><th className={styles.moneyCell}>Paid</th><th className={styles.moneyCell}>Balance due</th><th>Status</th><th>Action</th></tr></thead><tbody>
          {manualDues.filter((entry) => { const term = search.trim().toLowerCase(); const matches = !term || `${entry.customerName} ${entry.customerId} ${entry.reference} ${entry.notes}`.toLowerCase().includes(term); const bal = manualBalance(entry); const statusMatch = filter === "all" || (filter === "paid" && bal.due <= 0.009) || (filter === "partial" && bal.received > 0 && bal.due > 0.009) || (filter === "unpaid" && bal.received <= 0.009 && bal.due > 0.009) || (filter === "overdue" && entry.date < today && bal.due > 0.009); return matches && statusMatch; }).map((entry) => { const bal = manualBalance(entry); return <tr key={entry.id}><td><strong className={styles.customer}>{entry.customerName}</strong></td><td>{dateDisplay(entry.date)}</td><td>{entry.reference || entry.invoiceNo || "Manual entry"}</td><td className={styles.moneyCell}>₹ {money(bal.principal)}</td><td className={`${styles.moneyCell} ${styles.receiptAmount}`}>₹ {money(bal.received)}</td><td className={`${styles.moneyCell} ${styles.dueAmount}`}>₹ {money(bal.due)}</td><td><span className={`${styles.status} ${bal.due <= 0.009 ? styles.receiptAmount : bal.received > 0 ? styles.partial : styles.pending}`}><i />{bal.due <= 0.009 ? "Paid" : bal.received > 0 ? "Part-paid" : "Unpaid"}</span></td><td><button type="button" className={styles.collectButton} disabled={bal.due <= 0.009} onClick={() => { setSelectedManual(entry); setSelected(null); setAmount(String(Math.round(bal.due * 100) / 100)); setDate(today); setMode("Cash"); setReference(""); setNotes(""); }}>+ Record payment</button> <button type="button" className={styles.collectButton} onClick={() => { setEditingManualId(entry.id); setManualName(entry.customerName); setManualPhone(entry.customerId || ""); setManualDate(entry.date); setManualAmount(String(entry.amount)); setManualReference(entry.reference || ""); setManualNotes(entry.notes || ""); setManualOpen(true); }}>Edit</button></td></tr>; })}
        </tbody></table></div>
      </section>}

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Recent payment history</h2>
            <p>Every saved receipt with its date, payment mode and transaction reference.</p>
          </div>
          <span className={styles.count}>{entries.length} receipts</span>
        </div>
        {entries.length === 0 ? (
          <div className={styles.historyEmpty}>No customer receipts have been recorded yet. Use “Record payment” on an outstanding invoice to add the first receipt.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table>
              <thead><tr><th>Payment date</th><th>Customer</th><th>Invoice</th><th className={styles.moneyCell}>Amount received</th><th>Mode</th><th>Reference / notes</th></tr></thead>
              <tbody>
                {[...entries].sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")) || String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""))).slice(0, 20).map((entry) => (
                  <tr key={entry.id}>
                    <td><span className={styles.paymentDate}>{dateDisplay(entry.date)}</span><small className={styles.recordedTime}>Recorded {entry.createdAt && !Number.isNaN(new Date(entry.createdAt).getTime()) ? new Date(entry.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}</small></td>
                    <td><strong className={styles.customer}>{entry.customerName || "Customer"}</strong></td>
                    <td>{entry.type === "Manual Due" ? "Manual due added" : (entry.invoiceNo || (entry.invoiceId.startsWith("manual:") ? "Manual due payment" : "On-account"))}</td>
                    <td className={styles.moneyCell}><strong className={entry.type === "Manual Due" ? styles.dueAmount : styles.receiptAmount}>₹ {money(entry.amount)}</strong></td>
                    <td><span className={styles.modeBadge}>{entry.type === "Manual Due" ? "Due added" : entry.paymentMode}</span></td>
                    <td className={styles.referenceCell}>{entry.reference || entry.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {manualOpen && <div className={styles.modalBackdrop} role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) setManualOpen(false); }}>
        <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="manual-debtor-title">
          <div className={styles.modalHeader}><div><p className={styles.eyebrow}>MANUAL ACCOUNT ENTRY</p><h2 id="manual-debtor-title">{editingManualId ? "Edit manual debtor" : "Add debtor without a bill"}</h2><p>Save or update an amount someone owes even when no invoice exists in the system.</p></div><button type="button" className={styles.closeButton} onClick={() => setManualOpen(false)} disabled={saving} aria-label="Close">×</button></div>
          <div className={styles.balanceBanner}><span>Manual outstanding amount</span><strong>₹ {money(Number(manualAmount) || 0)}</strong></div>
          <div className={styles.formGrid}>
            <label><span>Customer name *</span><input value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="Enter customer / party name" required /></label>
            <label><span>Phone number</span><input value={manualPhone} onChange={(e) => setManualPhone(e.target.value)} placeholder="Contact number (optional)" /></label>
            <label><span>Due date / entry date *</span><input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} required /></label>
            <label><span>Amount due (₹) *</span><input type="number" min="0.01" step="0.01" value={manualAmount} onChange={(e) => setManualAmount(e.target.value)} placeholder="0.00" required /></label>
            <label className={styles.full}><span>Reference / reason</span><input value={manualReference} onChange={(e) => setManualReference(e.target.value)} placeholder="Old balance, material supplied, service, etc." /></label>
            <label className={styles.full}><span>Notes</span><textarea value={manualNotes} onChange={(e) => setManualNotes(e.target.value)} placeholder="Extra details (optional)" rows={3} /></label>
          </div>
          <div className={styles.modalActions}><button type="button" className={styles.cancelButton} onClick={() => setManualOpen(false)} disabled={saving}>Cancel</button><button type="button" className={styles.saveButton} onClick={saveManualDue} disabled={saving || !manualName.trim() || !manualDate || Number(manualAmount) <= 0}>{saving ? "Saving debtor…" : editingManualId ? "Update manual debtor" : "Save manual debtor"}</button></div>
        </section>
      </div>}

      {(selected || selectedManual) && (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) resetPayment(); }}>
          <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="payment-title">
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>RECEIPT ENTRY</p>
                <h2 id="payment-title">Record customer payment</h2>
                <p>{selected ? `${selected.customerName} · ${selected.invoice.meta.invoiceNo}` : `${selectedManual!.customerName} · ${selectedManual!.reference || "Manual due"}`}</p>
              </div>
              <button type="button" className={styles.closeButton} onClick={resetPayment} disabled={saving} aria-label="Close">×</button>
            </div>
            <div className={styles.balanceBanner}>
              <span>Outstanding balance</span>
              <strong>₹ {money(selected ? selected.due : manualBalance(selectedManual!).due)}</strong>
            </div>
            <div className={styles.formGrid}>
              <label><span>Payment date</span><input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} required /></label>
              <label><span>Amount received (₹)</span><input type="number" min="0.01" max={selected ? selected.due : manualBalance(selectedManual!).due} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required /></label>
              <label><span>Payment mode</span><select value={mode} onChange={(e) => setMode(e.target.value as LedgerPaymentMode)}>{modes.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label><span>Transaction / cheque reference</span><input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional reference number" /></label>
              <label className={styles.full}><span>Notes</span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment remarks (optional)" rows={3} /></label>
            </div>
            {Number(amount) > (selected ? selected.due : manualBalance(selectedManual!).due) && <p className={styles.validation}>Payment cannot exceed the outstanding balance.</p>}
            <div className={styles.modalActions}>
              <button type="button" className={styles.cancelButton} onClick={resetPayment} disabled={saving}>Cancel</button>
              <button type="button" className={styles.saveButton} onClick={savePayment} disabled={saving || !date || Number(amount) <= 0 || Number(amount) > (selected ? selected.due : manualBalance(selectedManual!).due)}>
                {saving ? "Saving payment…" : "Save receipt"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
