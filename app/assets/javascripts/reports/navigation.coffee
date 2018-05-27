window.navbar_stanza_anchor = null

$ ->
  $(window).scroll ->
    navbar = $('#navbar-stanza')

    active = navbar.find('a.active')
    if !active || active.length == 0
      window.navbar_stanza_anchor = null
      return false

    anchor = active.attr('href')
    if window.navbar_stanza_anchor == anchor
      return false
    window.navbar_stanza_anchor = anchor

    pos = active.parent().offset().left - navbar.find('a:first').offset().left
    pos = pos + (active.parent().width() / 2) - (navbar.width() / 2) # centering
    pos = Math.max(0, pos)
    navbar.find('.navbar-nav').stop().animate({ scrollLeft: pos });

    return false

  $('a[href^="#"]').on 'click', ->
    $('html, body').animate({
      scrollTop: $($.attr(this, 'href')).offset().top
    }, 500);

    return false
