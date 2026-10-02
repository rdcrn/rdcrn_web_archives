# RDCRN Web Archives

Static, offline-viewable snapshots of RDCRN consortium websites, served via GitHub Pages.

Each snapshot lives in a folder named `<consortium>-<YYYYMMDD>/` (the capture date). Folders ending in `-latest` are refreshed automatically; earlier versions are in the git history.

| Snapshot | Source | Captured |
|---|---|---|
| [cpic-20261002](cpic-20261002/) | https://cpic.rarediseasesnetwork.org | 2026-10-02 |
| [rc-dash-nascarr-latest](rc-dash-nascarr-latest/) | NASCARR GALAXY Registry REDCap dashboard (https://redcap.ucdenver.edu/surveys/?__dashboard=YHT3DR8JYX4) | Daily (latest) |

Notes:
- Captured with `wget --mirror`. Drupal core, theme assets, CDN libraries (Bootstrap, Font Awesome, select2, GSAP, cookiesjsr, Leaflet), the Roboto webfont, and images hosted on other rarediseasesnetwork.org hosts are stored locally (`ext/` holds files from external hosts, by hostname).
- Pages carry `noindex, nofollow`; Google Analytics and the third-party accessibility widget are removed.
- The clinical-sites map uses Leaflet with a saved snapshot of the RDCRN consortia API (`ext/wwwapi.rarediseasesnetwork.org/api/v1/consortia-CPIC.json`) instead of Google Maps. Only the OpenStreetMap base tiles load from the network.
- Spreaker podcast players remain live embeds, each with a direct episode link beneath it.
- `.nojekyll` disables Jekyll so files are served as-is.

## Daily REDCap dashboard snapshots

`.github/workflows/snapshot-redcap-dashboards.yml` runs every day at 07:17 UTC (and on demand from the Actions tab). It calls
`scripts/snapshot_redcap_dashboard.py URL DIR`, which downloads the public dashboard and its CSS/JS, makes all links local, adds
`noindex`, removes the CDN's monitoring beacon, and stamps a "captured" banner. It commits only when the dashboard's charts or
text change; timestamps, chart IDs and REDCap's random dot-plot jitter are ignored. To add another dashboard, add an entry to the
workflow's `matrix.include` list.
