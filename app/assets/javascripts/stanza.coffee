jQuery ($) ->
  RE = /^data-stanza-(.+)/
  $('[data-stanza]').each (index) ->
    $this = $(this)
    data = $this.data()
    params = {}
    $.each @attributes, (i, attr) ->
      key = (RE.exec(attr.name) or [])[1]
      if key
        params[key.replace('-', '_')] = attr.value
      return
    src = data.stanza + '?' + $.param(params)
    setTimeout (->
      $('<iframe></iframe>')
      .addClass('unload')
      .attr(
        src: src
        frameborder: 0
        id: 'stanza-frame-' + index
        name: 'stanza-frame-' + index
      )
      .width(data.stanzaWidth or '100%')
      .height(data.stanzaHeight)
      .appendTo($this)
      .load ->
        $(this).removeClass 'unload'
    ), index * 500
    return

  window.onmessage = (e) ->
    message = JSON.parse(e.data)
    iframe = $('#' + message.id)
    if iframe.attr('style').search(/height/) == -1
      iframe.height message.height
    return

  return

