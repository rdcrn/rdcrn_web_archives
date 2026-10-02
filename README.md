# RDCRN Web Archives

Static, offline-viewable snapshots of RDCRN consortium websites, served via GitHub Pages.

Each snapshot lives in a folder named `<consortium>-<YYYYMMDD>/` (the capture date).

| Snapshot | Source | Captured |
|---|---|---|
| [cpic-20261002](cpic-20261002/) | https://cpic.rarediseasesnetwork.org | 2026-10-02 |

Notes:
- Captured with `wget --mirror`. Drupal core, theme assets, CDN libraries (Bootstrap, Font Awesome, select2, GSAP, cookiesjsr, Leaflet), the Roboto webfont, and images hosted on other rarediseasesnetwork.org hosts are stored locally (`ext/` holds files from external hosts, by hostname).
- Pages carry `noindex, nofollow`; Google Analytics and the third-party accessibility widget are removed.
- The clinical-sites map uses Leaflet with a saved snapshot of the RDCRN consortia API (`ext/wwwapi.rarediseasesnetwork.org/api/v1/consortia-CPIC.json`) instead of Google Maps. Only the OpenStreetMap base tiles load from the network.
- Spreaker podcast players remain live embeds, each with a direct episode link beneath it.
- `.nojekyll` disables Jekyll so files are served as-is.
