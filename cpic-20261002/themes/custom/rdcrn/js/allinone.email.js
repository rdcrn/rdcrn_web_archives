var x = 0;
var aioaintervalID = setInterval(function() {
  if(document.querySelector(".aioa-widget-wrapper .accessibility-footer-report-link a") != null) {
    document.querySelector(".aioa-widget-wrapper .accessibility-footer-report-link a").setAttribute("href","mailto:support@rdcrn.org");
  }
  if (++x === 10){
    window.clearInterval(aioaintervalID);
  }
}, 1000);
