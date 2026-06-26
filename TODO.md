# TODO / Improvement Backlog

A prioritized list of improvements for the calendar webapp, grounded in the
current code. Items reference `file:line` where useful. Check items off as
they land.

---

## 🔴 Bugs (do these first)

- [ ] **Hardcoded year `'2025'`** — `src/components/calendar.js:693` always draws
  `year_data['2025']`, and `src/main.js:15` initializes a new calendar with
  `initialize_new(2025, ...)`. Today is 2026, so the app is permanently stuck on
  2025 and "completed day" shading no longer makes sense. Drive the year from the
  current date (or from a selectable/persisted "current year").

- [ ] **Google login popup is blocked** — `request_auth()` calls
  `client.requestAccessToken()` during page `load` (`src/main.js:46`,
  `src/components/drive_sync.js:62`), not from a user gesture, so browsers block
  the OAuth popup ("popup blocked / nothing"). Add an explicit **Sign in with
  Google** button and call `requestAccessToken()` from its click handler. Keep
  the silent path only for already-cached, unexpired tokens.

- [ ] **Dead/buggy scaling fast-path** — `src/components/calendar.js:158` reads
  `this.intermediary_scale_step`, but the value is a local `const`
  (`intermediary_scale_step`, line 157), so `this.intermediary_scale_step` is
  `undefined`. The `>` comparison is always false, making the high-zoom fast path
  dead code; if it ever did run, it references `intermediary_dim_x/y` before they
  are declared. Fix the reference (`this.` → local) and the variable ordering, or
  delete the branch.

- [ ] **`initialize_from_jsons` trusts `visuals`** —
  `src/components/calendar_data.js:81` does `this.visuals = json_obj.visuals`
  without checking it exists. Older exports / Drive files without a `visuals`
  block will set `visuals = undefined` and crash the renderer (which reads
  `visuals['background_color']`). Validate and fall back to defaults.

- [ ] **Public-asset base warning** — dev logs
  `Request URLs for public/ assets must also include your base` for
  `/favicon.ico`. The browser's implicit favicon request hits the root instead of
  `/calendar-webapp/`. Harmless, but fix by making the favicon `<link href>`
  base-aware (e.g. `import.meta.env.BASE_URL`).

---

## 🟠 Data safety & sync

- [ ] **Confirm before import overwrites** — Import replaces the entire calendar
  with no undo. Add a confirmation dialog, and consider auto-exporting a backup
  of the current data before applying an import.

- [ ] **Surface Drive sync status** — Several `// TODO: pop-up that says "Not
  syncing with google"` comments exist (`src/main.js:49`,
  `src/components/drive_sync.js`). Add a small status indicator (synced / signed
  out / error) so users know whether their data is backed up.

- [ ] **Modernize `drive_sync.js`** — Replace `XMLHttpRequest` with `fetch` +
  `async/await`, and stop putting `access_token` in URL query strings
  (`drive_sync.js` `check_for_file`/`delete_file`) — use the `Authorization`
  header everywhere so tokens don't leak into logs/history.

- [ ] **Use PATCH instead of delete+recreate** — `upload_json_string_to_file`
  deletes the existing file and uploads a new one (noted CORS workaround). Revisit
  the Drive `update` (PATCH) flow; delete+recreate risks data loss if the upload
  fails after the delete.

- [ ] **Debounce uploads** — Theme cycling and every form submit trigger a full
  Drive upload. Debounce/coalesce writes to reduce API churn.

---

## 🟡 Architecture & maintainability

- [ ] **Remove the `window.menu` global** — `menu.js` `refresh_checkbox_list`
  builds HTML with inline `onclick="menu.remove_checkbox(...)"`, which requires
  `window.menu` (`src/main.js:35`). Replace with `addEventListener` bound to the
  created elements; drop the global.

- [ ] **Adopt TypeScript (or JSDoc types)** — The data shapes (`CalendarData`,
  `CalendarMonthData`, `visuals`, `checkboxes`) are implicit. Types would catch
  the `visuals`/year-key classes of bugs at build time. Astro supports TS
  out of the box.

- [ ] **Centralize constants/defaults** — Default colors and the `finished_day`
  alpha (`0.16`) are duplicated across `calendar_data.js` and `menu.js`. Extract
  to one module.

- [ ] **Persist selected theme** — `current_theme_index` resets to 0 on reload
  (`menu.js`). Save it alongside the other view state in `localStorage`.

- [ ] **Add a schema/version field to saved JSON** — Lets future imports migrate
  old data and makes the "is this valid calendar data?" check meaningful.

---

## 🟢 Features

- [ ] **Multi-year support** — Add previous/next-year navigation and store data
  per year (the data model already keys by year; the renderer just needs to stop
  hardcoding one). Pairs with the hardcoded-year bug above.
- [ ] **Pinch-to-zoom on touch** — Only mouse `wheel` zoom and drag-to-pan are
  handled (`src/main.js`). Add touch pinch zoom for mobile.
- [ ] **Keyboard navigation / a11y** — The calendar is canvas-only with no
  keyboard or screen-reader affordances. Consider an accessible list/grid fallback
  for day entry.
- [ ] **PWA / offline** — `public/site.webmanifest` exists but has empty
  `name`/`short_name` and no service worker. Fill in the manifest and add offline
  caching so the app is installable.

---

## ⚪ Tooling & project hygiene

- [ ] **Tests** — No tests exist. Add unit tests (e.g. Vitest) for the pure
  logic: `starting_weekday`, `calc_days_in_month`, and the JSON
  save/load/round-trip in `calendar_data.js`.
- [ ] **Lint/format** — Add ESLint + Prettier; the codebase mixes `var`/`const`
  and spacing styles.
- [ ] **Fix the deploy workflow filename** — `.github/workflows/deploy_webpage`
  has no `.yml`/`.yaml` extension, so GitHub Actions likely ignores it. Rename to
  `deploy_webpage.yml`.
- [ ] **CI build check** — Run `npm run build` on PRs to catch breakages before
  deploy.

---

## ✅ Recently done

- [x] Ported from Vite (vanilla JS) to Astro.
- [x] Added Export / Import calendar buttons to the menu.
- [x] Removed the unused `cors` dependency.
- [x] Pinned the dev/preview port to 5173 (`strictPort`) so the Google OAuth
  authorized origin stays stable.
