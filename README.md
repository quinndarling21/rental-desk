# Rental Desk

Rental Desk is the counter app for Northstar Studio Services. Counter staff use it to check lighting, grip, power distro and carts out to productions on a rental agreement (RA) and to check that gear back in when it returns.

## Who uses it

- Rental counter staff in Burbank, Atlanta and Albuquerque: open agreements, check gear out, and run return check-in.
- Counter leads review the damage flags raised at return: Luis Ibarra (Burbank), Tasha Greene (Atlanta) and Ray Delgado (Albuquerque).

The top bar sets the counter location and the signed-in staff member. The agreements list opens on that location.

## Run it

Needs Node 20.19 or newer.

```sh
npm install
npm run dev
```

Vite serves the app on http://localhost:5173 and on the local network, so a counter tablet on the same network can open it.

## Build

```sh
npm run build
npm run preview
```

`npm run build` type checks with `tsc -b` and writes the site to `dist/`. `npm run preview` serves that build.

## Checks

- Run the tests: `npm test`
- Lint: `npm run lint`

## Folder map

```
data/                    inventory.json, agreements.json, staff.json
docs/returns.md          how return check-in works at the counter
src/
  main.tsx               entry point (HashRouter)
  App.tsx                routes
  types.ts               shared domain types
  styles.css             all styles, one section per area
  layout/                top bar, counter location and signed-in staff
  components/            shared UI: ConditionSelect, StatusBadge, StaffInitials, Banner
  features/
    agreements/          agreements list and agreement detail
    checkout/            check-out
    returns/             return check-in
    bench/               bench findings logged after return
    photos/              per-line photos and the read-only share page
  lib/
    agreements.ts        status, filtering, check-out and return rules
    inventory.ts         asset tag and barcode lookup, availability
    damageReports.ts     damage reports and routing to the counter lead
    photoCheckIn.ts      photo, condition, stamp, and Burbank pilot rules
    conditionStore.ts    photo storage interface; IndexedDB in the browser
    pilot.ts             Burbank photo check-in switch
    store.ts             changes made in this browser, saved to localStorage
    staff.ts, locations.ts, dates.ts
.github/workflows/pages.yml
```

## Data

All data is local JSON in `data/`, bundled at build time. There is no backend and no login.

Check-outs, returns and damage flags made at the counter are kept in the browser (localStorage key `rental-desk.session`) and applied on top of the JSON. The counter location and signed-in staff are kept under `rental-desk.counter`. Clearing site data in the browser starts fresh from the JSON.

The Burbank photo check-in pilot stores photos and condition records in this browser (IndexedDB database `rental-desk-condition`), behind a storage interface. There is no backend yet, so another device cannot see them, and clearing site data removes them. The pilot switch is `rental-desk.photo-checkin-pilot` in localStorage. It applies only when the agreement location is Burbank. It is on until someone turns it off at the Burbank counter.

Agreement status comes from the current date: Out, Due today, Overdue, or Returned once every item is back.

## Deployment

GitHub Pages, deployed from `main` by GitHub Actions (`.github/workflows/pages.yml`). Every push to `main` installs with `npm ci`, runs lint, the unit suite and the build, then publishes `dist/`. The build uses a relative base and hash routing, so it works under `/rental-desk/`. In the repository settings, Pages must use GitHub Actions as its source.

## Owners

Product: Maya Chen. Engineering: Priya Shah.
