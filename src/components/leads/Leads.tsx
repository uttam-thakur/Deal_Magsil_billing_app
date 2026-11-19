"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import styles from "./Leads.module.css";
import { Lead, LeadPriority, LeadSource, LeadStatus, LeadType } from "@/types";

type Props = {
  leads: Lead[];
  onSave: (lead: Lead) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

const SOURCES: LeadSource[] = [
  "Justdial",
  "IndiaMART",
  "WhatsApp",
  "Customer Referral",
  "Google / Website",
  "Facebook / Instagram",
  "Walk-in",
  "Existing Customer",
  "Contractor / Builder",
  "Other",
];

const STATUSES: LeadStatus[] = [
  "New",
  "Contacted",
  "Qualified",
  "Follow-up",
  "Quoted",
  "Won",
  "Lost",
];

const PRIORITIES: LeadPriority[] = ["Hot", "Warm", "Cold"];
const TYPES: LeadType[] = ["Homeowner", "Contractor", "Builder", "Dealer", "Institution", "Other"];

const today = () => new Date().toISOString().slice(0, 10);

const emptyLead = (): Lead => ({
  id: crypto.randomUUID(),
  leadDate: today(),
  source: "WhatsApp",
  sourceDetail: "",
  customerName: "",
  phone: "",
  whatsapp: "",
  email: "",
  address: "",
  sitePlace: "",
  leadType: "Homeowner",
  productInterest: "",
  requirement: "",
  expectedQuantity: 0,
  estimatedValue: 0,
  status: "New",
  priority: "Warm",
  nextFollowUpDate: "",
  remarks: "",
  lostReason: "",
  convertedInvoiceNo: "",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const money = (n: number) => `₹ ${Math.round(n || 0).toLocaleString("en-IN")}`;

export function Leads({ leads, onSave, onDelete }: Props) {
  const [editing, setEditing] = useState<Lead | null>(null);
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("All");
  const [status, setStatus] = useState("All");
  const [period, setPeriod] = useState("all");
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const now = new Date();
    return [...leads]
      .filter((lead) => {
        const q = search.trim().toLowerCase();
        const matchesSearch = !q || [
          lead.customerName, lead.phone, lead.whatsapp, lead.email,
          lead.sitePlace, lead.requirement, lead.productInterest,
          lead.source, lead.sourceDetail,
        ].join(" ").toLowerCase().includes(q);
        const matchesSource = source === "All" || lead.source === source;
        const matchesStatus = status === "All" || lead.status === status;
        const d = new Date(`${lead.leadDate}T00:00:00`);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const yearStart = new Date(now.getFullYear(), 0, 1);
        const matchesPeriod =
          period === "all" ||
          (period === "month" && d >= monthStart) ||
          (period === "year" && d >= yearStart);
        return matchesSearch && matchesSource && matchesStatus && matchesPeriod;
      })
      .sort((a, b) => b.leadDate.localeCompare(a.leadDate));
  }, [leads, search, source, status, period]);

  const metrics = useMemo(() => {
    const total = leads.length;
    const won = leads.filter((x) => x.status === "Won");
    const open = leads.filter((x) => !["Won", "Lost"].includes(x.status));
    const overdue = leads.filter((x) => x.nextFollowUpDate && x.nextFollowUpDate < today() && !["Won", "Lost"].includes(x.status));
    return {
      total,
      open: open.length,
      won: won.length,
      conversion: total ? Math.round((won.length / total) * 100) : 0,
      pipeline: open.reduce((s, x) => s + Math.max(0, x.estimatedValue || 0), 0),
      wonValue: won.reduce((s, x) => s + Math.max(0, x.estimatedValue || 0), 0),
      overdue: overdue.length,
    };
  }, [leads]);

  const submit = async () => {
    if (!editing?.customerName.trim()) {
      toast.error("Customer name is required.");
      return;
    }
    if (!editing.phone.trim() && !editing.whatsapp.trim() && !editing.email.trim()) {
      toast.error("Add at least one contact number or email.");
      return;
    }
    if (!editing.requirement.trim()) {
      toast.error("Add the customer requirement.");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        ...editing,
        updatedAt: new Date().toISOString(),
        estimatedValue: Number(editing.estimatedValue) || 0,
        expectedQuantity: Number(editing.expectedQuantity) || 0,
      });
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  const overdue = leads.filter(
    (x) => x.nextFollowUpDate && x.nextFollowUpDate < today() && !["Won", "Lost"].includes(x.status),
  );

  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <div>
          <span>MARKETING & SALES PIPELINE</span>
          <h1>Lead Management</h1>
          <p>Track where enquiries come from, what customers need, follow-ups, quotations and conversions.</p>
        </div>
        <button className={styles.primary} onClick={() => setEditing(emptyLead())}>＋ Add new lead</button>
      </div>

      <div className={styles.stats}>
        <div><span>Total Leads</span><strong>{metrics.total}</strong><small>All captured enquiries</small></div>
        <div><span>Open Pipeline</span><strong>{metrics.open}</strong><small>{money(metrics.pipeline)} estimated</small></div>
        <div><span>Won Leads</span><strong>{metrics.won}</strong><small>{money(metrics.wonValue)} converted value</small></div>
        <div><span>Conversion</span><strong>{metrics.conversion}%</strong><small>{metrics.overdue} follow-up{metrics.overdue === 1 ? "" : "s"} overdue</small></div>
      </div>

      <div className={styles.priorityOverview} aria-label="Lead priority overview">
        <div className={styles.priorityHot}><span>🔥 Hot leads</span><strong>{leads.filter((x) => x.priority === "Hot" && !["Won", "Lost"].includes(x.status)).length}</strong><small>Call first</small></div>
        <div className={styles.priorityWarm}><span>☀️ Warm leads</span><strong>{leads.filter((x) => x.priority === "Warm" && !["Won", "Lost"].includes(x.status)).length}</strong><small>Follow up with a quote</small></div>
        <div className={styles.priorityCold}><span>❄️ Cold leads</span><strong>{leads.filter((x) => x.priority === "Cold" && !["Won", "Lost"].includes(x.status)).length}</strong><small>Nurture periodically</small></div>
      </div>

      {overdue.length > 0 && (
        <div className={styles.followupBanner}>
          <b>⏰ Follow-up due</b>
          <span>{overdue.slice(0, 4).map((x) => x.customerName).join(", ")}{overdue.length > 4 ? ` +${overdue.length - 4} more` : ""}</span>
        </div>
      )}

      <div className={styles.filters}>
        <input placeholder="Search name, phone, site, requirement..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={source} onChange={(e) => setSource(e.target.value)}><option>All</option>{SOURCES.map((x) => <option key={x}>{x}</option>)}</select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}><option>All</option>{STATUSES.map((x) => <option key={x}>{x}</option>)}</select>
        <select value={period} onChange={(e) => setPeriod(e.target.value)}><option value="all">All time</option><option value="month">This month</option><option value="year">This year</option></select>
        <span>{filtered.length} lead{filtered.length === 1 ? "" : "s"}</span>
      </div>

      <div className={styles.layout}>
        <div className={styles.tableCard}>
          <div className={styles.cardHead}>
            <div><b>Lead register</b><small>Every enquiry becomes one row of business intelligence.</small></div>
          </div>
          {filtered.length ? (
            <div className={styles.tableWrap}>
              <table>
                <thead><tr><th>Date</th><th>Customer</th><th>Source</th><th>Requirement</th><th>Site</th><th>Value</th><th>Priority</th><th>Status</th><th>Follow-up</th><th /></tr></thead>
                <tbody>
                  {filtered.map((lead) => (
                    <tr key={lead.id}>
                      <td>{lead.leadDate}</td>
                      <td><b>{lead.customerName}</b><small>{lead.phone || lead.whatsapp || lead.email}</small></td>
                      <td><b>{lead.source}</b><small>{lead.sourceDetail}</small></td>
                      <td><div className={styles.requirement}>{lead.requirement}</div><small>{lead.productInterest || "Product not specified"}</small></td>
                      <td>{lead.sitePlace || "—"}</td>
                      <td>{lead.estimatedValue ? money(lead.estimatedValue) : "—"}</td>
                      <td><span className={`${styles.badge} ${lead.priority === "Hot" ? styles.priorityHot : lead.priority === "Warm" ? styles.priorityWarm : styles.priorityCold}`}>{lead.priority}</span></td>
                      <td><span className={`${styles.badge} ${styles[`status${lead.status.replace(/[^a-zA-Z]/g, "")}`] || ""}`}>{lead.status}</span></td>
                      <td className={lead.nextFollowUpDate && lead.nextFollowUpDate < today() && !["Won", "Lost"].includes(lead.status) ? styles.overdue : ""}>{lead.nextFollowUpDate || "—"}</td>
                      <td><button className={styles.edit} onClick={() => setEditing({ ...lead })}>Edit</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className={styles.empty}>No leads match your filters. Add the first enquiry to start tracking growth.</div>}
        </div>
      </div>

      {editing && (
        <div className={styles.modalBackdrop} onMouseDown={(e) => e.target === e.currentTarget && setEditing(null)}>
          <div className={styles.modal}>
            <div className={styles.modalHead}>
              <div><span>LEAD DETAILS</span><h2>{leads.some((x) => x.id === editing.id) ? "Update lead" : "Add new lead"}</h2></div>
              <button onClick={() => setEditing(null)}>×</button>
            </div>

            <div className={styles.form}>
              <label><span>Lead date *</span><input type="date" value={editing.leadDate} onChange={(e) => setEditing({ ...editing, leadDate: e.target.value })} /></label>
              <label><span>Lead source *</span><select value={editing.source} onChange={(e) => setEditing({ ...editing, source: e.target.value as LeadSource })}>{SOURCES.map((x) => <option key={x}>{x}</option>)}</select></label>
              <label><span>Source detail</span><input placeholder="Agent/account/campaign (optional)" value={editing.sourceDetail} onChange={(e) => setEditing({ ...editing, sourceDetail: e.target.value })} /></label>
              <label><span>Customer type</span><select value={editing.leadType} onChange={(e) => setEditing({ ...editing, leadType: e.target.value as LeadType })}>{TYPES.map((x) => <option key={x}>{x}</option>)}</select></label>

              <label><span>Customer name *</span><input placeholder="Customer / company name" value={editing.customerName} onChange={(e) => setEditing({ ...editing, customerName: e.target.value })} /></label>
              <label><span>Phone</span><input placeholder="Primary phone" value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></label>
              <label><span>WhatsApp</span><input placeholder="WhatsApp number" value={editing.whatsapp} onChange={(e) => setEditing({ ...editing, whatsapp: e.target.value })} /></label>
              <label><span>Email</span><input type="email" placeholder="customer@email.com" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></label>

              <label className={styles.span2}><span>Address</span><input placeholder="Customer address" value={editing.address} onChange={(e) => setEditing({ ...editing, address: e.target.value })} /></label>
              <label><span>Site / project place</span><input placeholder="Where work is required" value={editing.sitePlace} onChange={(e) => setEditing({ ...editing, sitePlace: e.target.value })} /></label>
              <label><span>Product / service interest</span><input placeholder="Paver, RCC pillar, block..." value={editing.productInterest} onChange={(e) => setEditing({ ...editing, productInterest: e.target.value })} /></label>

              <label className={styles.span2}><span>Customer requirement *</span><textarea rows={3} placeholder="What exactly does the customer need?" value={editing.requirement} onChange={(e) => setEditing({ ...editing, requirement: e.target.value })} /></label>
              <label><span>Expected quantity</span><input type="number" min="0" value={editing.expectedQuantity || ""} onChange={(e) => setEditing({ ...editing, expectedQuantity: Number(e.target.value) })} /></label>
              <label><span>Estimated order value (₹)</span><input type="number" min="0" value={editing.estimatedValue || ""} onChange={(e) => setEditing({ ...editing, estimatedValue: Number(e.target.value) })} /></label>

              <label><span>Status *</span><select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as LeadStatus })}>{STATUSES.map((x) => <option key={x}>{x}</option>)}</select></label>
              <label><span>Priority</span><select value={editing.priority} onChange={(e) => setEditing({ ...editing, priority: e.target.value as LeadPriority })}>{PRIORITIES.map((x) => <option key={x}>{x}</option>)}</select></label>
              <label><span>Next follow-up</span><input type="date" value={editing.nextFollowUpDate} onChange={(e) => setEditing({ ...editing, nextFollowUpDate: e.target.value })} /></label>
              <label><span>Converted invoice no.</span><input placeholder="DM/26-27/001" value={editing.convertedInvoiceNo} onChange={(e) => setEditing({ ...editing, convertedInvoiceNo: e.target.value })} /></label>

              <label className={styles.span2}><span>Remarks / sales notes</span><textarea rows={3} placeholder="Your remarks, quotation details, next action..." value={editing.remarks} onChange={(e) => setEditing({ ...editing, remarks: e.target.value })} /></label>
              {editing.status === "Lost" && <label className={styles.span2}><span>Lost reason</span><input placeholder="Price, competitor, delayed project, no response..." value={editing.lostReason} onChange={(e) => setEditing({ ...editing, lostReason: e.target.value })} /></label>}
            </div>

            <div className={styles.modalFoot}>
              {leads.some((x) => x.id === editing.id) && <button className={styles.delete} onClick={async () => { if (confirm("Delete this lead?")) { await onDelete(editing.id); setEditing(null); } }}>Delete</button>}
              <span />
              <button className={styles.secondary} onClick={() => setEditing(null)}>Cancel</button>
              <button className={styles.primary} disabled={saving} onClick={submit}>{saving ? "Saving..." : "Save lead"}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
