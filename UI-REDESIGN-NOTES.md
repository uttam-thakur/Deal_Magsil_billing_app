# Deal Magsil Responsive UI Update

## What changed
- Replaced the crowded horizontal navigation with a left sidebar inspired by the provided reference image.
- Added a collapse/expand control for desktop and tablet widths.
- Added a slide-in navigation drawer with backdrop for mobile screens.
- Added a compact workspace header with current section, readiness status, and signed-in account/role.
- Kept the existing feature modules and their business logic intact.
- Added shared responsive defaults to reduce horizontal overflow and improve mobile form/table behavior.
- Preserved role-based navigation visibility: staff see Dashboard, Inventory, and Attendance; owners retain the full menu.

## Run locally
1. Extract the ZIP.
2. Run `npm install`.
3. Run `npm run dev`.
4. Open the local URL printed by Next.js.

Note: dependency installation/build could not be completed in this environment, so run `npm run build` locally before deployment.
