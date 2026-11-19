
// 'use client';

// import styles from "./Invoices.module.css";
// import * as React from 'react';
// import { dateDisplay, money } from '@/lib/format';
// import { calc } from '@/lib/billing';
// import { Invoice } from '@/types';

// type StatusFilter = 'all' | 'pending' | 'successful';
// type BillTypeFilter = 'all' | 'GST' | 'Non-GST';

// const MONTHS = [
//   'All months',
//   'January',
//   'February',
//   'March',
//   'April',
//   'May',
//   'June',
//   'July',
//   'August',
//   'September',
//   'October',
//   'November',
//   'December',
// ];

// type Props = {
//   saved: Invoice[];
//   search: string;
//   setSearch: (v: string) => void;
//   onNew: () => void;
//   onOpen: (id: string) => void;
//   onPreview: (id: string) => void;
//   onDelete: (id: string) => void;
// };

// export function Invoices({
//   saved,
//   search,
//   setSearch,
//   onNew,
//   onOpen,
//   onPreview,
//   onDelete,
// }: Props) {
//   const [status, setStatus] =
//     React.useState<StatusFilter>('all');

//   const [billType, setBillType] =
//     React.useState<BillTypeFilter>('all');

//   const [month, setMonth] = React.useState('0');
//   const [fromDate, setFromDate] = React.useState('');
//   const [toDate, setToDate] = React.useState('');

//   const list = React.useMemo(
//     () =>
//       saved.filter((x) => {
//         const needle = search.toLowerCase();

//         const matchesSearch =
//           `${x.meta.invoiceNo} ${x.buyer.name} ${x.consignee.name}`
//             .toLowerCase()
//             .includes(needle);

//         const matchesStatus =
//           status === 'all' ||
//           (status === 'pending' &&
//             x.paymentStatus === 'Pending') ||
//           (status === 'successful' &&
//             x.paymentStatus === 'Successful');

//         // Bill Type filter: GST or Non-GST
//         const currentBillType: BillTypeFilter =
//           x.mode === 'GST' ? 'GST' : 'Non-GST';

//         const matchesBillType =
//           billType === 'all' ||
//           currentBillType === billType;

//         const matchesMonth =
//           month === '0' ||
//           Number(x.meta.date.slice(5, 7)) === Number(month);

//         const matchesFrom =
//           !fromDate || x.meta.date >= fromDate;

//         const matchesTo =
//           !toDate || x.meta.date <= toDate;

//         return (
//           matchesSearch &&
//           matchesStatus &&
//           matchesBillType &&
//           matchesMonth &&
//           matchesFrom &&
//           matchesTo
//         );
//       }),
//     [
//       saved,
//       search,
//       status,
//       billType,
//       month,
//       fromDate,
//       toDate,
//     ]
//   );

//   return (
//     <section className={styles["page"]}>
//       <div className={styles["page-title"]}>
//         <div>
//           <p className={styles["eyebrow"]}>
//             CLOUD INVOICE REGISTER
//           </p>
//           <h1>Saved Bills</h1>
//         </div>

//         <button
//           className={styles["primary"]}
//           onClick={onNew}
//         >
//           ＋ New Bill
//         </button>
//       </div>

//       <div className={styles["toolbar"]}>
//         <input
//           placeholder="Search invoice or customer…"
//           value={search}
//           onChange={(e) => setSearch(e.target.value)}
//           aria-label="Search invoice or customer"
//         />

//         <select
//           value={billType}
//           onChange={(e) =>
//             setBillType(e.target.value as BillTypeFilter)
//           }
//           aria-label="Filter by bill type"
//         >
//           <option value="all">All Bill Types</option>
//           <option value="GST">GST Bills</option>
//           <option value="Non-GST">Non-GST Bills</option>
//         </select>

//         <select
//           value={month}
//           onChange={(e) => setMonth(e.target.value)}
//           aria-label="Filter by month"
//         >
//           {MONTHS.map((name, i) => (
//             <option key={name} value={i}>
//               {name}
//             </option>
//           ))}
//         </select>

//         <input
//           type="date"
//           value={fromDate}
//           onChange={(e) => setFromDate(e.target.value)}
//           aria-label="From date"
//         />

//         <input
//           type="date"
//           value={toDate}
//           onChange={(e) => setToDate(e.target.value)}
//           aria-label="To date"
//         />

//         <select
//           value={status}
//           onChange={(e) =>
//             setStatus(e.target.value as StatusFilter)
//           }
//           aria-label="Filter by payment status"
//         >
//           <option value="all">All Status</option>
//           <option value="pending">Pending</option>
//           <option value="successful">Successful</option>
//         </select>
//       </div>

//       <div className={styles["results-info"]}>
//         Showing {list.length} of {saved.length} bills
//       </div>

//       {list.length === 0 ? (
//         <div className={styles["empty"]}>
//           No matching bills.
//         </div>
//       ) : (
//         <div className={styles["table-card"]}>
//           <table>
//             <thead>
//               <tr>
//                 <th>Invoice</th>
//                 <th>Date</th>
//                 <th>Customer</th>
//                 <th>Type</th>
//                 <th>Status</th>
//                 <th>Total</th>
//                 <th>Actions</th>
//               </tr>
//             </thead>

//             <tbody>
//               {list.map((x) => (
//                 <tr key={x.id}>
//                   <td>
//                     <b>{x.meta.invoiceNo}</b>
//                   </td>

//                   <td>{dateDisplay(x.meta.date)}</td>

//                   <td>
//                     {x.buyer.name ||
//                       x.consignee.name ||
//                       '—'}
//                   </td>

//                   <td>
//                     <span>
//                       {x.mode === 'GST' ? 'GST' : 'Non-GST'}
//                     </span>
//                   </td>

//                   <td>
//                     <span
//                       className={`${styles["status"]} ${
//                         x.paymentStatus === "Pending"
//                           ? styles["pending"]
//                           : styles["successful"]
//                       }`}
//                     >
//                       {x.paymentStatus}
//                     </span>
//                   </td>

//                   <td>₹ {money(calc(x).grand)}</td>

//                   <td>
//                     <button
//                       className={`${styles["primary"]} ${styles["table-action"]}`}
//                       onClick={() => onPreview(x.id)}
//                     >
//                       Open
//                     </button>

//                     <button
//                       className={styles["table-action"]}
//                       onClick={() => onOpen(x.id)}
//                     >
//                       Edit
//                     </button>

//                     <button
//                       className={`${styles["danger"]} ${styles["table-action"]}`}
//                       onClick={() => onDelete(x.id)}
//                     >
//                       Delete
//                     </button>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       )}
//     </section>
//   )
// };




'use client';

import * as React from 'react';
import styles from './Invoices.module.css';
import { dateDisplay, money } from '@/lib/format';
import { calc } from '@/lib/billing';
import { Invoice } from '@/types';

type StatusFilter = 'all' | 'pending' | 'successful';
type BillTypeFilter = 'all' | 'GST' | 'Non-GST';

const MONTHS = [
  'All months',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

type Props = {
  saved: Invoice[];
  search: string;
  setSearch: (v: string) => void;
  onNew: () => void;
  onOpen: (id: string) => void;
  onPreview: (id: string) => void;
  onDelete: (id: string) => void;
};

export function Invoices({
  saved,
  search,
  setSearch,
  onNew,
  onOpen,
  onPreview,
  onDelete,
}: Props) {
  const [status, setStatus] =
    React.useState<StatusFilter>('all');

  const [billType, setBillType] =
    React.useState<BillTypeFilter>('all');

  const [month, setMonth] = React.useState('0');
  const [fromDate, setFromDate] = React.useState('');
  const [toDate, setToDate] = React.useState('');

  const hasFilters =
    search.trim() !== '' ||
    status !== 'all' ||
    billType !== 'all' ||
    month !== '0' ||
    fromDate !== '' ||
    toDate !== '';

  const clearFilters = () => {
    setSearch('');
    setStatus('all');
    setBillType('all');
    setMonth('0');
    setFromDate('');
    setToDate('');
  };

  const list = React.useMemo(
    () =>
      saved.filter((x) => {
        const needle = search.trim().toLowerCase();

        const matchesSearch =
          `${x.meta.invoiceNo} ${x.buyer.name} ${x.consignee.name}`
            .toLowerCase()
            .includes(needle);

        const matchesStatus =
          status === 'all' ||
          (status === 'pending' &&
            x.paymentStatus === 'Pending') ||
          (status === 'successful' &&
            x.paymentStatus === 'Successful');

        const currentBillType: BillTypeFilter =
          x.mode === 'GST' ? 'GST' : 'Non-GST';

        const matchesBillType =
          billType === 'all' ||
          currentBillType === billType;

        const matchesMonth =
          month === '0' ||
          Number(x.meta.date.slice(5, 7)) === Number(month);

        const matchesFrom =
          !fromDate || x.meta.date >= fromDate;

        const matchesTo =
          !toDate || x.meta.date <= toDate;

        return (
          matchesSearch &&
          matchesStatus &&
          matchesBillType &&
          matchesMonth &&
          matchesFrom &&
          matchesTo
        );
      }),
    [
      saved,
      search,
      status,
      billType,
      month,
      fromDate,
      toDate,
    ]
  );

  return (
    <section className={styles.page}>
      {/* Page heading */}
      <header className={styles.pageTitle}>
        <div>
          <p className={styles.eyebrow}>
            BILLING MANAGEMENT
          </p>
          <h1>Saved Bills</h1>
          <p className={styles.subtitle}>
            Manage, search and track your invoices.
          </p>
        </div>

        <button
          type="button"
          className={styles.primary}
          onClick={onNew}
        >
          <span aria-hidden="true">＋</span>
          New Bill
        </button>
      </header>

      {/* Filter panel */}
      <section
        className={styles.filterCard}
        aria-label="Invoice filters"
      >
        <div className={styles.filterHeader}>
          <div className={styles.filterHeading}>
            <span className={styles.filterIcon} aria-hidden="true">
              ☷
            </span>
            <div>
              <h2>Find invoices</h2>
              <p>Filter bills by customer, date and status.</p>
            </div>
          </div>

          <button
            type="button"
            className={styles.clearButton}
            onClick={clearFilters}
            disabled={!hasFilters}
          >
            Reset filters
            <span aria-hidden="true"> ↺</span>
          </button>
        </div>

        <div className={styles.toolbar}>
          <label className={`${styles.field} ${styles.searchField}`}>
            <span>Search</span>
            <div className={styles.searchWrap}>
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                placeholder="Invoice no. or customer name"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search invoice or customer"
              />
            </div>
          </label>

          <label className={styles.field}>
            <span>Bill type</span>
            <select
              value={billType}
              onChange={(e) =>
                setBillType(e.target.value as BillTypeFilter)
              }
              aria-label="Filter by bill type"
            >
              <option value="all">All types</option>
              <option value="GST">GST bills</option>
              <option value="Non-GST">Non-GST bills</option>
            </select>
          </label>

          <label className={styles.field}>
            <span>Month</span>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              aria-label="Filter by month"
            >
              {MONTHS.map((name, i) => (
                <option key={name} value={String(i)}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>From date</span>
            <input
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={(e) => setFromDate(e.target.value)}
              aria-label="From date"
            />
          </label>

          <label className={styles.field}>
            <span>To date</span>
            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(e) => setToDate(e.target.value)}
              aria-label="To date"
            />
          </label>

          <label className={styles.field}>
            <span>Payment status</span>
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as StatusFilter)
              }
              aria-label="Filter by payment status"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="successful">Successful</option>
            </select>
          </label>
        </div>

        <div className={styles.filterFooter}>
          <span className={styles.resultsInfo}>
            Showing <strong>{list.length}</strong> of{' '}
            <strong>{saved.length}</strong> bills
          </span>

          {hasFilters && (
            <span className={styles.activeFilter}>
              Filters applied
            </span>
          )}
        </div>
      </section>

      {/* Invoice table */}
      {list.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon} aria-hidden="true">
            ▤
          </div>
          <h3>No bills found</h3>
          <p>
            Try changing your search or resetting the filters.
          </p>
          {hasFilters && (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={clearFilters}
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className={styles.tableCard}>
          <div className={styles.tableHeading}>
            <div>
              <h2>Invoice register</h2>
              <p>Your saved billing records</p>
            </div>
            <span className={styles.countBadge}>
              {list.length} bills
            </span>
          </div>

          <div className={styles.tableScroll}>
            <table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th className={styles.amountCell}>Total</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {list.map((x) => (
                  <tr key={x.id}>
                    <td>
                      <b className={styles.invoiceNo}>
                        {x.meta.invoiceNo}
                      </b>
                    </td>

                    <td>{dateDisplay(x.meta.date)}</td>

                    <td>
                      <span className={styles.customerName}>
                        {x.buyer.name ||
                          x.consignee.name ||
                          '—'}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`${styles.typeBadge} ${
                          x.mode === 'GST'
                            ? styles.gstBadge
                            : styles.nonGstBadge
                        }`}
                      >
                        {x.mode === 'GST' ? 'GST' : 'Non-GST'}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`${styles.status} ${
                          x.paymentStatus === 'Pending'
                            ? styles.pending
                            : styles.successful
                        }`}
                      >
                        <span className={styles.statusDot} />
                        {x.paymentStatus}
                      </span>
                    </td>

                    <td className={styles.amountCell}>
                      <b className={styles.amount}>
                        ₹ {money(calc(x).grand)}
                      </b>
                    </td>

                    <td>
                      <div className={styles.actions}>
                        <button
                          type="button"
                          className={styles.openButton}
                          onClick={() => onPreview(x.id)}
                        >
                          Open
                        </button>

                        <button
                          type="button"
                          className={styles.editButton}
                          onClick={() => onOpen(x.id)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className={styles.deleteButton}
                          onClick={() => onDelete(x.id)}
                          aria-label={`Delete invoice ${x.meta.invoiceNo}`}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
