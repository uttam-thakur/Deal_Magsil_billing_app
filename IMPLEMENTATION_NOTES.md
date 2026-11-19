# Deal Magsil update notes

## Included in this update

1. **Manual bill / invoice numbers**
   - New bills now start with a blank invoice number.
   - Saving a bill requires a number and checks for duplicate numbers (case-insensitive) before sending it to Google Sheets.
   - Existing invoice numbers are not rewritten.

2. **Company logo on bills**
   - Owner can upload the company logo from the Customers page.
   - Logo is stored in Google Drive separately from the company stamp and appears beside the company name in the printed invoice header.
   - Existing stamp handling remains separate.

3. **Full-data Excel-compatible export**
   - Settings now includes **Download all data (Excel)**.
   - This downloads the currently loaded company profile and all loaded business datasets as UTF-8 CSV, which opens directly in Microsoft Excel.
   - It is generated in the browser and does not call the Apps Script POST endpoint, avoiding the POST error for this download action.
   - This export is a snapshot of the data loaded in the current session. Use the Google Drive backup/restore workflow for a full spreadsheet-level backup.

4. **Dashboard styling**
   - Added clearer color separation to KPI cards and inventory alert panels while retaining the existing dashboard insights, filters, charts and tables.

5. **Service providers**
   - Replaced the wide provider table with responsive cards showing service, contact, address, vehicle, rate, terms and status.

## Important: configurable user/role management

The uploaded version currently has a fixed owner account and a hard-coded employee/staff login. It does not have a secure user-management API or a user-permission table. A configurable owner screen that creates arbitrary user IDs/passwords and per-module visibility requires a coordinated Apps Script authentication/schema migration and a redeployment of the Apps Script Web App. I have not added a front-end-only permission selector because that would not enforce permissions on the server and could expose business data. The existing owner/staff restrictions are preserved.

## Validation

- Apps Script `Code.gs` passed JavaScript syntax parsing with Node.js.
- Edited TSX files were checked for balanced braces and parentheses.
- A full Next.js production build could not be run in this environment: `npm ci` did not complete, leaving the Next.js executable and required type packages unavailable. Run `npm ci` and `npm run build` locally before deployment.
