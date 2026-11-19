# Stamp and Excel export fixes

## Company stamp on invoices
- Fixed the Apps Script `readStamp_()` lookup: it previously referenced an undefined `assetName`, so the stamp retrieval action could fail.
- Stamp upload and retrieval now return a Google Drive thumbnail URL.
- Invoice rendering prefers the stored Drive file ID, which avoids stale saved URLs, and displays a visible placeholder if the stamp image cannot load.
- Printing waits for print-area images to load (with a timeout) before opening the print dialog.

## Full data export
- Replaced the single CSV export with an Excel-compatible SpreadsheetML workbook.
- Each application dataset is exported to its own worksheet/tab, with column headers, readable styling, and landscape / fit-to-width print settings.
- Export runs in the browser from the loaded app data and does not make a POST request to Apps Script.

## Deployment
1. Deploy the updated `google-apps-script/Code.gs` as a new version of your Apps Script Web App.
2. Keep the same Web App URL in the Deal Magsil app.
3. Sign in, open Settings, and use **Download all data (Excel)**.
4. Open the downloaded `.xml` workbook with Microsoft Excel or LibreOffice Calc. Each dataset is a separate worksheet.

Note: This is an Excel-compatible multi-worksheet XML workbook, not a native `.xlsx` file. The frontend bootstrap payload does not contain the original Google Sheets cell formatting, so the export uses clean workbook formatting rather than claiming to reproduce every source-sheet style.
