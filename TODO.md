# TODO / Improvement Backlog

A prioritized list of improvements for the calendar webapp, grounded in the
current code. Items reference `file:line` where useful. Check items off as
they land.

---

## 🔴 Bugs (do these first)

- [x] **Hardcoded year `'2025'`** — `src/components/calendar.js:693` always draws
  `year_data['2025']`, and `src/main.js:15` initializes a new calendar with
  `initialize_new(2025, ...)`. Today is 2026, so the app is permanently stuck on
  2025 and "completed day" shading no longer makes sense. Drive the year from the
  current date (or from a selectable/persisted "current year"). _Done: the
  renderer now stacks **every** year in `year_data` (oldest first) instead of a
  hardcoded one; an `ensure_year` guard seeds the current year so an empty
  calendar still renders. `main.js` initializes with the current year. See
  Multi-year support below._

- [x] **Google login popup is blocked** — `request_auth()` calls
  `client.requestAccessToken()` during page `load` (`src/main.js:46`,
  `src/components/drive_sync.js:62`), not from a user gesture, so browsers block
  the OAuth popup ("popup blocked / nothing"). Add an explicit **Sign in with
  Google** button and call `requestAccessToken()` from its click handler. Keep
  the silent path only for already-cached, unexpired tokens. _Done: a
  "Sign in to sync" tab (bottom-left) appears only when no valid cached token
  exists; the popup opens from its click/keyboard handler. GSI client init is
  now lazy and guarded, so a blocked/missing GSI script no longer throws at
  load (which used to kill all calendar interaction). Real popup flow still
  needs one manual verification on port 5173._

- [x] **Dead/buggy scaling fast-path** — `src/components/calendar.js:158` reads
  `this.intermediary_scale_step`, but the value is a local `const`
  (`intermediary_scale_step`, line 157), so `this.intermediary_scale_step` is
  `undefined`. The `>` comparison is always false, making the high-zoom fast path
  dead code; if it ever did run, it references `intermediary_dim_x/y` before they
  are declared. Fix the reference (`this.` → local) and the variable ordering, or
  delete the branch. _Done: compare against the local `intermediary_scale_step`
  and draw from the full staging canvas (not the undeclared `intermediary_dim_*`),
  so the high-zoom path now skips the iterative downscale as intended._

- [x] **`initialize_from_jsons` trusts `visuals`** —
  `src/components/calendar_data.js:81` does `this.visuals = json_obj.visuals`
  without checking it exists. Older exports / Drive files without a `visuals`
  block will set `visuals = undefined` and crash the renderer (which reads
  `visuals['background_color']`). Validate and fall back to defaults. _Done:
  extracted a shared `DEFAULT_VISUALS` constant and merge it under any loaded
  `visuals`, so missing keys fall back to defaults._

- [x] **Public-asset base warning** — dev logs
  `Request URLs for public/ assets must also include your base` for
  `/favicon.ico`. _Moot: the site migrated to Render at the domain root and the
  `/calendar-webapp` base path was removed entirely._

---

## 🟠 Data safety & sync

- [~] **Confirm before import overwrites** — Import replaces the entire calendar
  with no undo. Add a confirmation dialog, and consider auto-exporting a backup
  of the current data before applying an import. _Confirmation dialog done;
  auto-export backup still open._

- [x] **Surface Drive sync status** — Several `// TODO: pop-up that says "Not
  syncing with google"` comments exist (`src/main.js:49`,
  `src/components/drive_sync.js`). Add a small status indicator (synced / signed
  out / error) so users know whether their data is backed up. _Done: a
  bottom-left corner tab (mirror of the menu tab) shows Not syncing / Syncing… /
  Synced / Sync error, driven by a status listener on the file handler. While
  signed out or errored, clicking the tab reopens the sign-in page (with a
  still-valid token the silent path re-pulls the file, so it doubles as a
  retry)._

- [x] **Modernize `drive_sync.js`** — Replace `XMLHttpRequest` with `fetch` +
  `async/await`, and stop putting `access_token` in URL query strings
  (`drive_sync.js` `check_for_file`/`delete_file`) — use the `Authorization`
  header everywhere so tokens don't leak into logs/history. _Done._

- [x] **Use PATCH instead of delete+recreate** — `upload_json_string_to_file`
  deletes the existing file and uploads a new one (noted CORS workaround). Revisit
  the Drive `update` (PATCH) flow; delete+recreate risks data loss if the upload
  fails after the delete. _Done: in-place `uploadType=media` PATCH first; on
  failure falls back to create-then-delete, never deleting the old file before a
  replacement provably exists. Also fixed a startup race where a save during the
  initial file listing could create a duplicate calendar.json. Watch the console
  on the first real save in case PATCH hits CORS (safe fallback if it does)._

- [x] **Debounce uploads** — Theme cycling and every form submit trigger a full
  Drive upload. Debounce/coalesce writes to reduce API churn. _Done: 1.5s
  trailing debounce, in-flight writes never overlap, newest data always wins.
  Known gap: a save within ~1.5s of closing the tab stays local-only until the
  next session's save._

---

## 🟡 Architecture & maintainability

- [x] **Remove the `window.menu` global** — `menu.js` `refresh_checkbox_list`
  builds HTML with inline `onclick="menu.remove_checkbox(...)"`, which requires
  `window.menu` (`src/main.js:35`). Replace with `addEventListener` bound to the
  created elements; drop the global. _Done — also fixes markup breakage when a
  checkbox name contains quotes/HTML (names now go through `textContent`)._

- [ ] **Adopt TypeScript (or JSDoc types)** — The data shapes (`CalendarData`,
  `CalendarMonthData`, `visuals`, `checkboxes`) are implicit. Types would catch
  the `visuals`/year-key classes of bugs at build time. Astro supports TS
  out of the box.

- [x] **Centralize constants/defaults** — Default colors and the `finished_day`
  alpha (`0.16`) are duplicated across `calendar_data.js` and `menu.js`. Extract
  to one module. _Done: `DEFAULT_VISUALS` and `FINISHED_DAY_ALPHA` exported from
  `calendar_data.js`._

- [x] **Persist selected theme** — `current_theme_index` resets to 0 on reload
  (`menu.js`). Save it alongside the other view state in `localStorage`. _Done
  (`localStorage['theme_index']`, validated on load)._

- [ ] **Add a schema/version field to saved JSON** — Lets future imports migrate
  old data and makes the "is this valid calendar data?" check meaningful.

---

## 🟢 Features

- [~] **Multi-year support** — _Partly done: the renderer now stacks all years
  in `year_data` vertically (oldest first), sizing the staging canvas to fit, and
  click ids are year-scoped so stacked days don't collide. Still TODO:
  previous/next-year navigation / a way to add a new year from the UI._
- [x] **Pinch-to-zoom on touch** — Only mouse `wheel` zoom and drag-to-pan are
  handled (`src/main.js`). Add touch pinch zoom for mobile. _Done as part of the
  Pointer Events rewrite (two-finger pinch zooms about the midpoint and pans)._
- [ ] **Keyboard navigation / a11y** — The calendar is canvas-only with no
  keyboard or screen-reader affordances. Consider an accessible list/grid fallback
  for day entry.
- [ ] **PWA / offline** — `public/site.webmanifest` exists but has empty
  `name`/`short_name` and no service worker. Fill in the manifest and add offline
  caching so the app is installable.

---

## ⚪ Tooling & project hygiene

- [x] **Tests** — No tests exist. Add unit tests (e.g. Vitest) for the pure
  logic: `starting_weekday`, `calc_days_in_month`, and the JSON
  save/load/round-trip in `calendar_data.js`. _Done: Vitest + 12 tests
  (`npm test`). Both date functions now delegate to `Date`, fixing a real
  leap-year bug where Jan/Feb month grids were shifted one weekday (2020, 2024,
  2028, ...) and the missing century rule in `calc_days_in_month`._
- [ ] **Lint/format** — Add ESLint + Prettier; the codebase mixes `var`/`const`
  and spacing styles.
- [x] **Fix the deploy workflow filename** — _Moot: GitHub Pages deployment was
  removed entirely; the site deploys to Render (in-hindsight.app) on push to
  main._
- [ ] **CI build check** — Run `npm run build` on PRs to catch breakages before
  deploy.

---

## ✅ Recently done

- [x] Ported from Vite (vanilla JS) to Astro.
- [x] Added Export / Import calendar buttons to the menu.
- [x] Removed the unused `cors` dependency.
- [x] Pinned the dev/preview port to 5173 (`strictPort`) so the Google OAuth
  authorized origin stays stable.
