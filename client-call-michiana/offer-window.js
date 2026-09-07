(function () {
  'use strict';
  function offerWindow(now) {
    var parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: 'numeric' }).formatToParts(now);
    var year = Number(parts.find(function (p) { return p.type === 'year'; }).value);
    var month = Number(parts.find(function (p) { return p.type === 'month'; }).value) - 1;
    var dates = [0, 1, 2].map(function (offset) { return new Date(Date.UTC(year, month + offset, 1)); });
    var crossesYear = dates[0].getUTCFullYear() !== dates[2].getUTCFullYear();
    var names = dates.map(function (date) {
      return new Intl.DateTimeFormat('en-US', { month: 'long', year: crossesYear ? 'numeric' : undefined, timeZone: 'UTC' }).format(date);
    });
    return names[0] + ', ' + names[1] + ', and ' + names[2] + (crossesYear ? '' : ' ' + year);
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = offerWindow;
  if (typeof document === 'undefined') return;
  function refresh() {
    var label = offerWindow(new Date());
    document.querySelectorAll('[data-offer-window]').forEach(function (node) { node.textContent = label; });
  }
  refresh();
  window.addEventListener('pageshow', refresh);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) refresh(); });
  window.setInterval(refresh, 60000);
}());
