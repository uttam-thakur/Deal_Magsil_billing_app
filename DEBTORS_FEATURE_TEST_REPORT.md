# Debtors & Collections — Implementation / Test Report

## Added
- Owner-only Debtors page in the main navigation.
- Outstanding balance, customer count, and aged invoice overview cards.
- Outstanding invoice list with customer, invoice date, billed amount, receipts allocated, and remaining balance.
- Search by customer, invoice number, or phone; filters for all outstanding, older invoices, and partially paid invoices.
- Receipt form capturing payment date, amount, mode, transaction/cheque reference, and notes.
- Recent receipt history with date, customer, invoice, amount, mode, and reference.
- Dashboard receivables overview showing total open balance, unique customers owing, older unpaid invoices, and the largest balances, with a shortcut to Debtors.
- Uses the existing Ledger receipt API and spreadsheet schema; no new spreadsheet tab or migration is required.

## Validation
- TypeScript/TSX syntax transpilation: passed for 27 source files, with zero syntax diagnostics.
- Full `tsc --noEmit` / Next.js production build: not completed. The source archive has no complete installed dependency tree, and `npm ci --ignore-scripts --no-audit --no-fund` timed out in this environment. The TypeScript checker consequently reported missing type-definition packages rather than app-level diagnostics.
- No live Google Apps Script / spreadsheet integration test was possible from this local archive.

## Accounting behaviour
- The outstanding amount is invoice total less receipts linked to that invoice.
- An invoice marked `Successful` is treated as fully paid, consistent with the existing Ledger screen.
- The dashboard’s “Older unpaid bills” uses invoice dates as a reminder only; it is not a contractual due-date calculation.
