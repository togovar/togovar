$ ->
  isIE = ->
    userAgent = window.navigator.userAgent.toLowerCase()
    if userAgent.indexOf('msie') != -1 or userAgent.indexOf('trident') != -1
      return true
    false

  if isIE()
    html = """
      <p><b>TogoStanza(JS) does not support your browser.<br>Please try to use browsers below:</b></p>
      <strong><i class="fa fa-windows" aria-hidden="true"></i> PC</strong>
      <ul>
        <li>Edge 42+</li>
        <li>Firefox 61.0+</li>
        <li>Google Chrome 68.0+</li>
        <li>Opera 54.0+</li>
      </ul>
      <strong><i class="fa fa-apple" aria-hidden="true"></i> Mac</strong>
      <ul>
        <li>Firefox 61.0+</li>
        <li>Google Chrome 68.0+</li>
        <li>Opera 54.0+</li>
        <li>Safari 11.0+</li>
      </ul>
      <strong><i class="fa fa-linux" aria-hidden="true"></i> Linux</strong>
      <ul>
        <li>Firefox 61.0+</li>
        <li>Google Chrome 68.0+</li>
        <li>Opera 54.0+</li>
      </ul>
    """
    $('.stanza-wrap:first').html(html)
    return
