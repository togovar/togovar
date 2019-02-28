$(document).ready(function () {
  var RE = /^data-stanza-(.+)/;

  $('[data-stanza]').each(function (index) {
    var $this = $(this),
      data = $this.data(),
      params = {};

    $.each(this.attributes, function (i, attr) {
      var key = (RE.exec(attr.name) || [])[1];

      if (key) {
        params[key.replace('-', '_')] = attr.value;
      }
    });

    var src = data.stanza + '?' + $.param(params);

    setTimeout(function () {
      $("<iframe></iframe>")
        .addClass('unload')
        .attr({src: src, frameborder: 0, id: 'stanza-frame-' + index, name: 'stanza-frame-' + index})
        .width(data.stanzaWidth || '100%')
        .height(data.stanzaHeight)
        .appendTo($this)
        .load(function () {
          $(this).removeClass("unload");
        });
    }, index * 500);
  });

  window.onmessage = function (e) {
    var message = JSON.parse(e.data);
    var iframe = $('#' + message.id);

    if (iframe.attr('style').search(/height/) === -1) {
      iframe.height(message.height);
    }
  };
});
