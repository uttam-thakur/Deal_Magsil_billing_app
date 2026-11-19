# Deal Magsil Google Sheets Cloud Backend

This Apps Script is the backend for the Deal Magsil billing app. It uses one Google Spreadsheet workbook and separate sheets for each data area.

## Deploy

1. Open https://script.google.com/ while signed in to the Google account that should own Deal Magsil data.
2. Create a new project.
3. Replace the editor code with `Code.gs`.
4. Save.
5. Deploy → New deployment → Web app.
6. Execute as: **Me**.
7. Who has access: **Anyone**.
8. Authorize Google Sheets and Drive access.
9. Copy the `/exec` Web App URL.
10. Paste it into the Deal Magsil login screen.

The script automatically creates **Deal Magsil Billing Data** in the owner's Google Drive and these tabs:

- `Users` — login accounts and password hashes
- `Company` — company settings
- `Products` — product master
- `Customers` — customer master
- `Invoices` — complete invoice records, including metadata, parties and line items

## Initial login

- Username: `admin`
- Password: `DealMagsil@123`

Change it after first login from **Company → Account → Change Password**.

## Important

The Web App is deliberately accessible from the browser without Google OAuth because the Next.js frontend uses JSONP for reads and hidden-form POSTs for writes. The backend validates a short-lived session token before returning or changing data.

For a higher-security multi-user deployment, replace the bundled login layer with Google Identity/OAuth or another proper identity provider.

## Important update for the latest version

This version no longer submits POST requests through a hidden iframe. The frontend uses a `no-cors` POST and then polls the Apps Script for the mutation result. This removes the browser console error:

`Refused to display 'https://script.google.com/' in a frame because it set 'X-Frame-Options' to 'sameorigin'.`

It also adds dedicated product save/update/delete operations and server-side duplicate protection.

### If you already deployed an older Apps Script

Replace the old `Code.gs` with this version and then:

1. Click **Deploy → Manage deployments**.
2. Open the existing Web App deployment.
3. Choose **Edit**.
4. Select **New version**.
5. Deploy.
6. Keep the same `/exec` URL in the billing app.

The latest script prefers the spreadsheet that the Apps Script is bound to. Therefore the recommended setup is one Google Sheet → **Extensions → Apps Script** → paste `Code.gs` → deploy as Web App.


## Service providers and purchase register

The app now creates two additional Google Sheets tabs automatically when the updated Apps Script is deployed and the owner opens the dashboard:

- `ServiceProviders`: provider name, service category, phone numbers, address, service details, vehicle/truck number, rate, payment terms, status and remarks.
- `Purchases`: date, item/service, supplier, quantity/unit, unit price, total, paid amount, remaining due, supplier invoice reference, payment status/mode and remarks.

After replacing `Code.gs`, deploy it as a **New version** of the existing Web App deployment. Keep the same spreadsheet and `/exec` URL. Only owner sessions can read or mutate these two registers; employee sessions receive empty provider/purchase collections and the backend rejects their write actions.


## Google Drive backup and restore

The app now supports owner-only manual backups, backup listing, and restore from a dated Google Drive copy. The Apps Script backend verifies the backup after copying, validates required sheets before restore, and creates a verified `SAFETY` copy before changing the live spreadsheet. Restore keeps the live spreadsheet ID so the existing app URL and configured data source continue to work. The company stamp file is not moved or modified.

### Enable automatic daily backup (required one-time setup)

1. Open the existing Apps Script project attached to the Deal Magsil billing deployment.
2. Make sure the updated `Code.gs` is saved in the project used by the current web-app deployment.
3. In the Apps Script editor, select `setupDailyBackupTrigger` and click **Run** once while signed in as the Google account that owns/has edit access to the spreadsheet and Drive folder.
4. Review and approve the Google Drive, Sheets, and trigger permissions.
5. The function creates the dedicated `Deal Magsil Backups` Drive folder if needed, creates and verifies an initial backup, and installs one daily trigger (around 2 AM in the Apps Script project's timezone).
6. Deploy a new version of the existing Web App (Deploy → Manage deployments → Edit → New version → Deploy). Keep the same deployment URL used by the app.

### Safety / retention

- Backup and restore endpoints enforce owner-only access in Apps Script; hiding the UI is not the security boundary.
- Daily and manual backups are retained for 30 days; the newest daily/manual backup is never deleted by cleanup.
- Pre-restore safety copies are retained and are not included in automatic cleanup.
- Restore verifies required sheet names and compares sheet names, row counts, and headers after copying. It does not restore the stamp image because the stamp is a separate Drive file and is left untouched.
- Test restore on a separate test spreadsheet before relying on it for production. Keep the Apps Script project and Drive backup folder accessible only to trusted owners.

## Export the original Google Sheets workbook to Excel

The Settings → Download all data (Excel) action now exports the live Google Sheets spreadsheet through the Drive export endpoint as a real `.xlsx` workbook. It keeps the spreadsheet's separate tabs, cell formatting, column widths, formulas and sheet layout as supported by Google Sheets export. The endpoint is owner-only.

After updating `Code.gs`, deploy a **new version** of the existing Web App. On first use, approve the additional Google Drive / external request authorization prompt if shown. The export reads the existing spreadsheet; it does not rewrite or modify any sheet data.

## Stamp rendering on printed invoices

The stamp endpoint now returns the saved Drive image as a base64 data URL. The app reloads this image when the cloud data is loaded and uses it directly in the invoice, avoiding reliance on a public Google Drive thumbnail URL that may fail in print preview. Keep the existing stamp file in Drive; no re-upload is required.


## Fix for `UrlFetchApp.fetch` authorization error (Excel download)

If Excel download reports `You do not have permission to call UrlFetchApp.fetch` or asks for `script.external_request`, the Apps Script deployment has not yet been authorized for the external request scope. Apply this one-time update using the Google account that owns the Web App deployment:

1. Open the **existing** Apps Script project (the one attached to the live Deal Magsil spreadsheet/deployment).
2. In **Project Settings**, enable **Show `appsscript.json` manifest file in editor** if it is not visible.
3. Replace the manifest contents with the `appsscript.json` supplied in this folder. It declares `script.external_request`, Drive, Sheets, and trigger scopes used by this backend. Do not create a second Apps Script project.
4. Replace `Code.gs` with the supplied updated file and save both files.
5. In the function selector, choose `authorizeWorkbookExport` and click **Run**. Review the Google consent screen and approve the requested permissions. This one-time function performs a read-only XLSX export test; it does not edit the spreadsheet.
6. After it completes successfully, choose **Deploy → Manage deployments → Edit** on the existing Web App deployment, select **New version**, and click **Deploy**. Keep the same deployment URL and spreadsheet.
7. Reload Deal Magsil and try **Settings → Download all data (Excel)** again.

The Web App must remain configured to **Execute as: Me** (the spreadsheet owner/deployer). If the deployment executes as the accessing user, each user would need their own Drive/Sheets authorization and access. Do not remove the existing session/owner checks. The export endpoint remains owner-only.
