$(document).ready(function () {
  var html, isIE;
  isIE = function() {
    var userAgent;
    userAgent = window.navigator.userAgent.toLowerCase();
    if (userAgent.indexOf('msie') !== -1 || userAgent.indexOf('trident') !== -1) {
      return true;
    }
    return false;
  };
  if (isIE()) {
    html = "<p><b>TogoStanza(JS) does not support your browser.<br>Please try to use browsers below:</b></p>\n<strong><i class=\"fa fa-windows\" aria-hidden=\"true\"></i> PC</strong>\n<ul>\n  <li>Edge 42+</li>\n  <li>Firefox 61.0+</li>\n  <li>Google Chrome 68.0+</li>\n  <li>Opera 54.0+</li>\n</ul>\n<strong><i class=\"fa fa-apple\" aria-hidden=\"true\"></i> Mac</strong>\n<ul>\n  <li>Firefox 61.0+</li>\n  <li>Google Chrome 68.0+</li>\n  <li>Opera 54.0+</li>\n  <li>Safari 11.0+</li>\n</ul>\n<strong><i class=\"fa fa-linux\" aria-hidden=\"true\"></i> Linux</strong>\n<ul>\n  <li>Firefox 61.0+</li>\n  <li>Google Chrome 68.0+</li>\n  <li>Opera 54.0+</li>\n</ul>";
    $('.stanza-wrap:first').html(html);
  }
});
