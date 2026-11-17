# Tutor Schedule

## Tailwind CSS

The app uses Tailwind CSS v4 with the CLI to generate a local production stylesheet. Install dependencies and build it with:

```sh
npm install
npm run build
```

The generated `css/tailwind.css` is linked by all HTML pages and should be included when deploying the static site. While editing utility classes in the HTML or JavaScript, run `npm run watch:css` to rebuild the stylesheet automatically.

## Navigation

On narrow screens, navigation is shown as a horizontal bar at the top of each page. After scrolling down, a floating hamburger button opens a separate side drawer, without moving the page content; the drawer supports a backdrop, Escape-key, and keyboard focus. Desktop navigation remains in the page header.

## Student history and pauses

Before using student pause/archive features, run the SQL files in `supabase/migrations/` in order in the Supabase SQL Editor. They add pause and archive periods to `public.students`; no existing attendance records are removed. A student marked as deleted is hidden from the roster and future schedules, while completed sessions and salary history remain available. Paused and archived dates are excluded from salary totals.

Attendance status is stored per scheduled date in the existing `sessions` JSON: `attended`, `absent`, `cancelled`, or `postponed`. Legacy `true` records remain attended and legacy `false` or unset records remain unrecorded. The `missed.html` page lists due sessions that are absent or unrecorded; future, cancelled, and postponed sessions are excluded. Marking a missed session as compensated records it as attended for its scheduled date, removes it from the missed list, and includes it in salary totals using that session's saved price.

The dashboard offers a monthly backup reminder on the first visit each month. It downloads only after the user chooses the download button; choosing “later” dismisses that month's reminder. Automated backup files cannot be created while the site is closed in a static browser deployment.

## Schedule conflicts and sync status

When adding or editing a student's schedule, the app warns about duplicate start times on the same weekday, including duplicates within that student's schedule. One-time dated sessions are checked against the matching date. The user can cancel the save or explicitly continue despite the warning; paused and archived students are not treated as active conflicts. The salary page applies the same check to added sessions.

A status indicator shows the Supabase connection, active saves, successful saves, and connection or save errors. A successful save is shown only after Supabase confirms the write.
