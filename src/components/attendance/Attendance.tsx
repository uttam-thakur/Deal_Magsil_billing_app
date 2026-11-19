"use client";

import { useMemo, useState } from "react";
import styles from "./Attendance.module.css";
import { AttendanceRecord, AttendanceStatus, Worker, WorkerType, WageType } from "@/types";

type Props = {
  workers: Worker[];
  records: AttendanceRecord[];
  onSaveWorker: (worker: Worker) => Promise<void>;
  onDeleteWorker: (id: string) => Promise<void>;
  onSaveAttendance: (record: AttendanceRecord) => Promise<void>;
  onDeleteAttendance: (id: string) => Promise<void>;
};

const today = () => new Date().toISOString().slice(0, 10);

const blankWorker = (): Worker => ({
  id: "",
  name: "",
  phone: "",
  type: "LABOUR",
  role: "",
  wageType: "DAILY",
  wageRate: 0,
  joiningDate: today(),
  active: true,
  notes: "",
  createdAt: new Date().toISOString(),
});

const blankRecord = (): AttendanceRecord => ({
  id: "",
  date: today(),
  workerId: "",
  workerName: "",
  workerType: "LABOUR",
  status: "PRESENT",
  inTime: "09:00",
  outTime: "",
  breakMinutes: 0,
  totalHours: 0,
  overtimeHours: 0,
  site: "",
  remarks: "",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

function hoursBetween(inTime: string, outTime: string, breakMinutes: number) {
  if (!inTime || !outTime) return 0;
  const [ih, im] = inTime.split(":").map(Number);
  const [oh, om] = outTime.split(":").map(Number);
  if (![ih, im, oh, om].every(Number.isFinite)) return 0;
  const start = ih * 60 + im;
  const end = oh * 60 + om;
  if (end <= start) return 0;
  return Math.max(0, (end - start - Math.max(0, breakMinutes)) / 60);
}

export function Attendance({
  workers,
  records,
  onSaveWorker,
  onDeleteWorker,
  onSaveAttendance,
  onDeleteAttendance,
}: Props) {
  const [section, setSection] = useState<"today" | "history" | "workers">("today");
  const [workerDraft, setWorkerDraft] = useState<Worker>(blankWorker());
  const [attendanceDraft, setAttendanceDraft] = useState<AttendanceRecord>(blankRecord());
  const [month, setMonth] = useState(today().slice(0, 7));
  const [search, setSearch] = useState("");
  const [workerSearch, setWorkerSearch] = useState("");
  const [busy, setBusy] = useState(false);

  const activeWorkers = useMemo(
    () => workers.filter((w) => w.active).sort((a, b) => a.name.localeCompare(b.name)),
    [workers],
  );

  const monthRecords = useMemo(
    () => records.filter((r) => r.date.startsWith(month)),
    [records, month],
  );

  const todayRecords = useMemo(
    () => records.filter((r) => r.date === today()),
    [records],
  );

  const presentToday = todayRecords.filter((r) => r.status === "PRESENT" || r.status === "HALF_DAY").length;
  const absentToday = todayRecords.filter((r) => r.status === "ABSENT").length;
  const markedToday = new Set(todayRecords.map((r) => r.workerId)).size;

  const selectedWorker = workers.find((w) => w.id === attendanceDraft.workerId);

  const monthlyByWorker = useMemo(() => {
    return activeWorkers.map((worker) => {
      const rows = monthRecords.filter((r) => r.workerId === worker.id);
      const present = rows.filter((r) => r.status === "PRESENT").length;
      const half = rows.filter((r) => r.status === "HALF_DAY").length;
      const absent = rows.filter((r) => r.status === "ABSENT").length;
      const leave = rows.filter((r) => r.status === "LEAVE").length;
      const hours = rows.reduce((sum, r) => sum + Number(r.totalHours || 0), 0);
      const overtime = rows.reduce((sum, r) => sum + Number(r.overtimeHours || 0), 0);
      return { worker, present, half, absent, leave, hours, overtime };
    });
  }, [activeWorkers, monthRecords]);

  const visibleHistory = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...records]
      .filter((r) => !month || r.date.startsWith(month))
      .filter((r) => !q || `${r.workerName} ${r.site} ${r.status} ${r.remarks}`.toLowerCase().includes(q))
      .sort((a, b) => `${b.date}${b.workerName}`.localeCompare(`${a.date}${a.workerName}`));
  }, [records, month, search]);

  const visibleWorkers = useMemo(() => {
    const q = workerSearch.trim().toLowerCase();
    return workers
      .filter((w) => !q || `${w.name} ${w.phone} ${w.role} ${w.type}`.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [workers, workerSearch]);

  const resetAttendance = () => setAttendanceDraft(blankRecord());
  const resetWorker = () => setWorkerDraft(blankWorker());

  const chooseWorker = (id: string) => {
    const worker = workers.find((w) => w.id === id);
    if (!worker) return;
    setAttendanceDraft((d) => ({
      ...d,
      workerId: worker.id,
      workerName: worker.name,
      workerType: worker.type,
    }));
  };

  const submitWorker = async () => {
    if (busy) return;
    if (!workerDraft.name.trim()) {
      alert("Worker/staff name is required.");
      return;
    }
    if (workerDraft.wageRate < 0 || !Number.isFinite(Number(workerDraft.wageRate))) {
      alert("Please enter a valid wage/rate.");
      return;
    }
    setBusy(true);
    try {
      await onSaveWorker({
        ...workerDraft,
        id: workerDraft.id || crypto.randomUUID(),
        name: workerDraft.name.trim(),
        phone: workerDraft.phone.trim(),
        role: workerDraft.role.trim(),
        wageRate: Number(workerDraft.wageRate) || 0,
        createdAt: workerDraft.createdAt || new Date().toISOString(),
      });
      resetWorker();
    } finally {
      setBusy(false);
    }
  };

  const submitAttendance = async () => {
    if (busy) return;
    if (!attendanceDraft.workerId) {
      alert("Please select a worker/staff member.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(attendanceDraft.date)) {
      alert("Please select a valid attendance date.");
      return;
    }
    if (attendanceDraft.status === "PRESENT" && !attendanceDraft.inTime) {
      alert("IN time is required for Present attendance.");
      return;
    }
    if (attendanceDraft.outTime && attendanceDraft.inTime) {
      const [ih, im] = attendanceDraft.inTime.split(":").map(Number);
      const [oh, om] = attendanceDraft.outTime.split(":").map(Number);
      if (![ih, im, oh, om].every(Number.isFinite) || oh * 60 + om <= ih * 60 + im) {
        alert("OUT time must be later than IN time.");
        return;
      }
    }

    const duplicate = records.find(
      (r) =>
        r.id !== attendanceDraft.id &&
        r.workerId === attendanceDraft.workerId &&
        r.date === attendanceDraft.date,
    );
    if (duplicate) {
      alert("Attendance is already marked for this worker on this date. Open it from History to edit.");
      return;
    }

    const total = attendanceDraft.status === "PRESENT" || attendanceDraft.status === "HALF_DAY"
      ? hoursBetween(attendanceDraft.inTime, attendanceDraft.outTime, Number(attendanceDraft.breakMinutes) || 0)
      : 0;

    const overtime = total > 8 ? total - 8 : 0;

    setBusy(true);
    try {
      await onSaveAttendance({
        ...attendanceDraft,
        id: attendanceDraft.id || crypto.randomUUID(),
        workerName: selectedWorker?.name || attendanceDraft.workerName,
        workerType: selectedWorker?.type || attendanceDraft.workerType,
        breakMinutes: Math.max(0, Number(attendanceDraft.breakMinutes) || 0),
        totalHours: Number(total.toFixed(2)),
        overtimeHours: Number(overtime.toFixed(2)),
        createdAt: attendanceDraft.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      resetAttendance();
    } finally {
      setBusy(false);
    }
  };

  const editAttendance = (record: AttendanceRecord) => {
    setAttendanceDraft({ ...record });
    setSection("today");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const editWorker = (worker: Worker) => {
    setWorkerDraft({ ...worker });
    setSection("workers");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const totalMonthlyHours = monthRecords.reduce((s, r) => s + Number(r.totalHours || 0), 0);
  const totalOvertime = monthRecords.reduce((s, r) => s + Number(r.overtimeHours || 0), 0);

  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>PEOPLE & ATTENDANCE</p>
          <h1>Attendance Management</h1>
          <p>Mark daily attendance, record IN/OUT time and review worker-wise monthly attendance.</p>
        </div>
        <div className={styles.stats}>
          <div><b>{activeWorkers.length}</b><span>Active Workers</span></div>
          <div><b>{markedToday}</b><span>Marked Today</span></div>
          <div><b>{presentToday}</b><span>Present</span></div>
          <div><b>{absentToday}</b><span>Absent</span></div>
        </div>
      </div>

      <div className={styles.tabs}>
        <button className={section === "today" ? styles.active : ""} onClick={() => setSection("today")}>📅 Daily Attendance</button>
        <button className={section === "history" ? styles.active : ""} onClick={() => setSection("history")}>📋 History & Summary</button>
        <button className={section === "workers" ? styles.active : ""} onClick={() => setSection("workers")}>👷 Workers & Staff</button>
      </div>

      {section === "today" && (
        <>
          <div className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <h2>Mark Attendance</h2>
                <p>One attendance record per worker per date.</p>
              </div>
              <button className={styles.secondary} onClick={resetAttendance}>Clear</button>
            </div>
            <div className={styles.formGrid}>
              <label><span>Date *</span><input type="date" value={attendanceDraft.date} onChange={(e) => setAttendanceDraft({ ...attendanceDraft, date: e.target.value })} /></label>
              <label><span>Worker / Staff *</span>
                <select value={attendanceDraft.workerId} onChange={(e) => chooseWorker(e.target.value)}>
                  <option value="">Select worker</option>
                  {activeWorkers.map((w) => <option key={w.id} value={w.id}>{w.name} — {w.type === "LABOUR" ? "Labour" : "Staff"}</option>)}
                </select>
              </label>
              <label><span>Status *</span>
                <select value={attendanceDraft.status} onChange={(e) => setAttendanceDraft({ ...attendanceDraft, status: e.target.value as AttendanceStatus })}>
                  <option value="PRESENT">Present</option>
                  <option value="HALF_DAY">Half Day</option>
                  <option value="ABSENT">Absent</option>
                  <option value="LEAVE">Leave</option>
                </select>
              </label>
              <label><span>Site / Location</span><input value={attendanceDraft.site} placeholder="Factory / Site name" onChange={(e) => setAttendanceDraft({ ...attendanceDraft, site: e.target.value })} /></label>
              <label><span>IN Time</span><input type="time" value={attendanceDraft.inTime} disabled={attendanceDraft.status === "ABSENT" || attendanceDraft.status === "LEAVE"} onChange={(e) => setAttendanceDraft({ ...attendanceDraft, inTime: e.target.value })} /></label>
              <label><span>OUT Time</span><input type="time" value={attendanceDraft.outTime} disabled={attendanceDraft.status === "ABSENT" || attendanceDraft.status === "LEAVE"} onChange={(e) => setAttendanceDraft({ ...attendanceDraft, outTime: e.target.value })} /></label>
              <label><span>Break (minutes)</span><input type="number" min="0" max="720" value={attendanceDraft.breakMinutes} disabled={attendanceDraft.status === "ABSENT" || attendanceDraft.status === "LEAVE"} onChange={(e) => setAttendanceDraft({ ...attendanceDraft, breakMinutes: Number(e.target.value) })} /></label>
              <label><span>Total Hours</span><input value={attendanceDraft.status === "ABSENT" || attendanceDraft.status === "LEAVE" ? "0.00" : hoursBetween(attendanceDraft.inTime, attendanceDraft.outTime, attendanceDraft.breakMinutes).toFixed(2)} readOnly /></label>
              <label className={styles.full}><span>Remarks</span><textarea rows={2} value={attendanceDraft.remarks} placeholder="Optional note" onChange={(e) => setAttendanceDraft({ ...attendanceDraft, remarks: e.target.value })} /></label>
              <div className={styles.actions}>
                <button className={styles.primary} disabled={busy} onClick={submitAttendance}>{attendanceDraft.id ? "Update Attendance" : "Save Attendance"}</button>
              </div>
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHead}>
              <div><h2>Today</h2><p>{todayRecords.length} record(s) marked for {today()}.</p></div>
              <div className={styles.quickStats}><span>Present <b>{presentToday}</b></span><span>Absent <b>{absentToday}</b></span></div>
            </div>
            <div className={styles.tableWrap}>
              <table>
                <thead><tr><th>Worker</th><th>Type</th><th>Status</th><th>IN</th><th>OUT</th><th>Hours</th><th>OT</th><th>Site</th><th>Action</th></tr></thead>
                <tbody>
                  {todayRecords.length === 0 && <tr><td colSpan={9} className={styles.empty}>No attendance marked today.</td></tr>}
                  {todayRecords.map((r) => (
                    <tr key={r.id}>
                      <td><b>{r.workerName}</b></td>
                      <td>{r.workerType === "LABOUR" ? "Labour" : "Staff"}</td>
                      <td><span className={`${styles.badge} ${styles[r.status.toLowerCase()]}`}>{r.status.replace("_", " ")}</span></td>
                      <td>{r.inTime || "—"}</td><td>{r.outTime || "—"}</td><td>{r.totalHours.toFixed(2)}</td><td>{r.overtimeHours.toFixed(2)}</td><td>{r.site || "—"}</td>
                      <td><div className={styles.rowActions}><button onClick={() => editAttendance(r)}>Edit</button><button className={styles.delete} onClick={() => onDeleteAttendance(r.id)}>Delete</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {section === "history" && (
        <>
          <div className={styles.panel}>
            <div className={styles.filterRow}>
              <label><span>Month</span><input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></label>
              <label className={styles.search}><span>Search</span><input value={search} placeholder="Worker, site, status..." onChange={(e) => setSearch(e.target.value)} /></label>
              <div className={styles.monthStats}><b>{monthRecords.length}</b><span>Records</span><b>{totalMonthlyHours.toFixed(1)}h</b><span>Total Hours</span><b>{totalOvertime.toFixed(1)}h</b><span>Overtime</span></div>
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHead}><div><h2>Worker-wise Summary</h2><p>Attendance count and working hours for {month}.</p></div></div>
            <div className={styles.tableWrap}>
              <table>
                <thead><tr><th>Worker</th><th>Type</th><th>Present</th><th>Half Day</th><th>Absent</th><th>Leave</th><th>Hours</th><th>OT</th></tr></thead>
                <tbody>
                  {monthlyByWorker.map((x) => <tr key={x.worker.id}><td><b>{x.worker.name}</b></td><td>{x.worker.type === "LABOUR" ? "Labour" : "Staff"}</td><td>{x.present}</td><td>{x.half}</td><td>{x.absent}</td><td>{x.leave}</td><td>{x.hours.toFixed(1)}</td><td>{x.overtime.toFixed(1)}</td></tr>)}
                </tbody>
              </table>
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHead}><div><h2>Attendance History</h2><p>Edit any existing record when a time or status needs correction.</p></div></div>
            <div className={styles.tableWrap}>
              <table>
                <thead><tr><th>Date</th><th>Worker</th><th>Status</th><th>IN</th><th>OUT</th><th>Hours</th><th>OT</th><th>Site</th><th>Action</th></tr></thead>
                <tbody>
                  {visibleHistory.length === 0 && <tr><td colSpan={9} className={styles.empty}>No records found.</td></tr>}
                  {visibleHistory.map((r) => <tr key={r.id}><td>{r.date}</td><td><b>{r.workerName}</b></td><td><span className={`${styles.badge} ${styles[r.status.toLowerCase()]}`}>{r.status.replace("_", " ")}</span></td><td>{r.inTime || "—"}</td><td>{r.outTime || "—"}</td><td>{r.totalHours.toFixed(2)}</td><td>{r.overtimeHours.toFixed(2)}</td><td>{r.site || "—"}</td><td><div className={styles.rowActions}><button onClick={() => editAttendance(r)}>Edit</button><button className={styles.delete} onClick={() => onDeleteAttendance(r.id)}>Delete</button></div></td></tr>)}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {section === "workers" && (
        <>
          <div className={styles.panel}>
            <div className={styles.panelHead}><div><h2>Worker / Staff Master</h2><p>Add people once, then select them in daily attendance.</p></div><button className={styles.secondary} onClick={resetWorker}>Clear</button></div>
            <div className={styles.formGrid}>
              <label><span>Name *</span><input value={workerDraft.name} placeholder="Full name" onChange={(e) => setWorkerDraft({ ...workerDraft, name: e.target.value })} /></label>
              <label><span>Type *</span><select value={workerDraft.type} onChange={(e) => setWorkerDraft({ ...workerDraft, type: e.target.value as WorkerType })}><option value="LABOUR">Labour</option><option value="STAFF">Staff</option></select></label>
              <label><span>Role / Work</span><input value={workerDraft.role} placeholder="Mason / Helper / Accountant" onChange={(e) => setWorkerDraft({ ...workerDraft, role: e.target.value })} /></label>
              <label><span>Phone</span><input value={workerDraft.phone} placeholder="Phone number" inputMode="tel" onChange={(e) => setWorkerDraft({ ...workerDraft, phone: e.target.value })} /></label>
              <label><span>Wage Type</span><select value={workerDraft.wageType} onChange={(e) => setWorkerDraft({ ...workerDraft, wageType: e.target.value as WageType })}><option value="DAILY">Daily</option><option value="MONTHLY">Monthly</option><option value="HOURLY">Hourly</option></select></label>
              <label><span>Wage / Rate</span><input type="number" min="0" value={workerDraft.wageRate} onChange={(e) => setWorkerDraft({ ...workerDraft, wageRate: Number(e.target.value) })} /></label>
              <label><span>Joining Date</span><input type="date" value={workerDraft.joiningDate} onChange={(e) => setWorkerDraft({ ...workerDraft, joiningDate: e.target.value })} /></label>
              <label><span>Status</span><select value={workerDraft.active ? "ACTIVE" : "INACTIVE"} onChange={(e) => setWorkerDraft({ ...workerDraft, active: e.target.value === "ACTIVE" })}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label>
              <label className={styles.full}><span>Notes</span><textarea rows={2} value={workerDraft.notes} placeholder="Optional notes" onChange={(e) => setWorkerDraft({ ...workerDraft, notes: e.target.value })} /></label>
              <div className={styles.actions}><button className={styles.primary} disabled={busy} onClick={submitWorker}>{workerDraft.id ? "Update Worker" : "Add Worker"}</button></div>
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.toolbar}><div><h2>People</h2><p>{workers.length} total worker/staff records.</p></div><input value={workerSearch} placeholder="Search people..." onChange={(e) => setWorkerSearch(e.target.value)} /></div>
            <div className={styles.tableWrap}>
              <table>
                <thead><tr><th>Name</th><th>Type</th><th>Role</th><th>Phone</th><th>Wage</th><th>Joining</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {visibleWorkers.length === 0 && <tr><td colSpan={8} className={styles.empty}>No workers added yet.</td></tr>}
                  {visibleWorkers.map((w) => <tr key={w.id}><td><b>{w.name}</b></td><td>{w.type === "LABOUR" ? "Labour" : "Staff"}</td><td>{w.role || "—"}</td><td>{w.phone || "—"}</td><td>{w.wageType} ₹{w.wageRate.toLocaleString("en-IN")}</td><td>{w.joiningDate || "—"}</td><td><span className={`${styles.badge} ${w.active ? styles.activeBadge : styles.inactiveBadge}`}>{w.active ? "ACTIVE" : "INACTIVE"}</span></td><td><div className={styles.rowActions}><button onClick={() => editWorker(w)}>Edit</button>{!w.active && <button className={styles.delete} onClick={() => onDeleteWorker(w.id)}>Delete</button>}</div></td></tr>)}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
