/**
 * Archive replacement for the live site's Google Maps consortium-site map.
 * Renders the same star markers and study popups with Leaflet, using a
 * snapshot of the RDCRN consortia API saved alongside the archive.
 */
(function () {
  var STAR = "m 23.595218,13.65816 c -0.0584,0.0517 -0.122546,0.09861 -0.192758,0.138822 l -3.198063,1.846209 1.677338,3.802465 c 0.03701,0.09064 0.05521,0.176486 0.06414,0.260093 0.09319,0.325837 0.146168,0.668583 0.146168,1.024413 0,2.051026 -1.662962,3.714066 -3.71407,3.714066 -1.049653,0 -1.996205,-0.437212 -2.671115,-1.137396 -0.02491,-0.0185 -0.0517,-0.03255 -0.07531,-0.0533 l -2.821439,-2.45445 -2.8214358,2.45445 c -0.029667,0.02585 -0.063189,0.04436 -0.094459,0.06702 -0.6746476,0.692522 -1.6157417,1.124 -2.6593487,1.124 -2.051029,0 -3.7140699,-1.662962 -3.7140699,-3.714069 0,-0.35041 0.063826,-0.683264 0.1547751,-1.004965 0.00337,-0.10276 0.020115,-0.209352 0.067017,-0.322961 L 5.4113522,15.619862 2.2544598,13.797593 c -7.492e-4,-3.3e-4 -0.00112,-7.5e-4 -0.0015,-0.0011 -1.1782481,-0.622947 -1.98182806,-1.858953 -1.98182806,-3.284177 0,-2.0513507 1.66296196,-3.7140655 3.71406986,-3.7140655 0.033188,0 0.064466,0.007 0.097655,0.00798 0.031278,-0.00262 0.061911,-0.00925 0.094141,-0.00925 h 3.927546 L 9.2492935,2.9121323 c 0.023299,-0.086803 0.057765,-0.1669079 0.097973,-0.2425442 0.5386992,-1.3866564 1.8825665,-2.37087276 3.4597445,-2.37087276 1.582568,0 2.929931,0.99123986 3.465135,2.38517066 0.03671,0.071486 0.06734,0.1474407 0.08872,0.2281826 l 1.144749,3.8848169 3.956306,3.297e-4 c 0.02712,0 0.05297,0.00607 0.07978,0.00798 0.02937,-7.491e-4 0.05712,-0.0067 0.0868,-0.0067 2.051025,0 3.71407,1.6629619 3.71407,3.7140688 -3.26e-4,1.327262 -0.699539,2.489253 -1.747274,3.145696 z";

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c];
    });
  }

  function starIcon(highlight) {
    var fill = highlight ? '#ffee00' : '#404040';
    var stroke = highlight ? '#404040' : 'white';
    var width = highlight ? 1 : 0.1;
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">' +
      '<path d="' + STAR + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + width + '"/></svg>';
    return L.divIcon({className: 'site-map-star', html: svg, iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -12]});
  }

  function popupHtml(cs) {
    var studies = (cs.studies || []).slice().sort(function (a, b) {
      return a.study.protocol > b.study.protocol ? 1 : a.study.protocol < b.study.protocol ? -1 : 0;
    });
    var links = studies.map(function (ss) {
      return '<span class="gg-tt-body-study" title="' + esc(ss.study.name) + '"><a href="' +
        esc(ss.study.website_url) + '">' + esc(ss.study.protocol) + '</a></span>';
    });
    return '<div class="gm-tt"><div class="gm-tt-head">' + esc(cs.site.name) + '</div>' +
      '<div class="gg-tt-body">' + links.join(', ') + '</div></div>';
  }

  window.buildSiteMap = function (elementId, dataUrl) {
    var el = document.getElementById(elementId);
    if (!el || !window.L) return;
    var map = L.map(el, {zoomControl: true, scrollWheelZoom: false}).setView([37.09024, -95.712891], 4);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    fetch(dataUrl).then(function (r) { return r.json(); }).then(function (json) {
      var sites = json.results[0].sites.filter(function (s) {
        return s.latitude && s.longitude && !isNaN(s.latitude) && !isNaN(s.longitude);
      });
      var bounds = [];
      sites.forEach(function (cs) {
        var pos = [parseFloat(cs.latitude), parseFloat(cs.longitude)];
        L.marker(pos, {icon: starIcon(cs.is_admin_core), zIndexOffset: cs.is_admin_core ? 1000 : 0})
          .bindPopup(popupHtml(cs)).addTo(map);
        bounds.push(pos);
      });
      if (bounds.length) map.fitBounds(bounds, {padding: [20, 20]});
    }).catch(function (e) { console.error('Site map data failed to load', e); });
  };
})();
