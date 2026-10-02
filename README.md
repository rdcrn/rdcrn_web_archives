# RDCRN Web Archives

Static, offline-viewable snapshots of RDCRN consortium websites, served via GitHub Pages.

Each snapshot lives in a folder named `<consortium>-<YYYYMMDD>/` (the capture date).

| Snapshot | Source | Captured |
|---|---|---|
| [cpic-20261002](cpic-20261002/) | https://cpic.rarediseasesnetwork.org | 2026-10-02 |

Notes:
- Captured with `wget --mirror`; Drupal core and CDN assets (Bootstrap, Font Awesome, etc.) are stored locally under each snapshot (`ext/` for CDN files).
- Online-only services (Google Maps, Google Analytics, accessibility widget, Google Fonts) still load from the network when available.
- `.nojekyll` disables Jekyll so files are served as-is.
