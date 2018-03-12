$.fn.dataTableExt.oApi.fnPagingInfo = (oSettings) ->
  {
    'iStart': oSettings._iDisplayStart
    'iEnd': oSettings.fnDisplayEnd()
    'iLength': oSettings._iDisplayLength
    'iTotal': oSettings.fnRecordsTotal()
    'iFilteredTotal': oSettings.fnRecordsDisplay()
    'iPage': if oSettings._iDisplayLength == -1 then 0 else Math.ceil(oSettings._iDisplayStart / oSettings._iDisplayLength)
    'iTotalPages': if oSettings._iDisplayLength == -1 then 0 else Math.ceil(oSettings.fnRecordsDisplay() / oSettings._iDisplayLength)
  }

$.extend $.fn.dataTableExt.oPagination, 'custom-bootstrap':
  'fnInit': (oSettings, nPaging, fnDraw) ->
    oLang = oSettings.oLanguage.oPaginate

    fnClickHandler = (e) ->
      e.preventDefault()
      if oSettings.oApi._fnPageChange(oSettings, e.data.action)
        fnDraw oSettings
      return

    $(nPaging).addClass('pagination').append '<ul>' + '<li class="prev disabled"><a href="#">«</a></li>' + '<li class="prev disabled"><a href="#">‹</a></li>' + '<li class="next disabled"><a href="#">›</a></li>' + '<li class="next disabled"><a href="#">»</a></li>' + '</ul>'
    els = $('a', nPaging)
    $(els[0]).bind 'click.DT', { action: 'first' }, fnClickHandler
    $(els[1]).bind 'click.DT', { action: 'previous' }, fnClickHandler
    $(els[2]).bind 'click.DT', { action: 'next' }, fnClickHandler
    $(els[3]).bind 'click.DT', { action: 'last' }, fnClickHandler
    return
  'fnUpdate': (oSettings, fnDraw) ->
    iListLength = 5
    oPaging = oSettings.oInstance.fnPagingInfo()
    an = oSettings.aanFeatures.p
    i = undefined
    j = undefined
    sClass = undefined
    iStart = undefined
    iEnd = undefined
    iHalf = Math.floor(iListLength / 2)
    if oPaging.iTotalPages < iListLength
      iStart = 1
      iEnd = oPaging.iTotalPages
    else if oPaging.iPage <= iHalf
      iStart = 1
      iEnd = iListLength
    else if oPaging.iPage >= oPaging.iTotalPages - iHalf
      iStart = oPaging.iTotalPages - iListLength + 1
      iEnd = oPaging.iTotalPages
    else
      iStart = oPaging.iPage - iHalf + 1
      iEnd = iStart + iListLength - 1
    i = 0
    iLen = an.length
    while i < iLen
      $('li:gt(1)', an[i]).filter(':not(.next)').remove()
      j = iStart
      while j <= iEnd
        sClass = if j == oPaging.iPage + 1 then 'class="active"' else ''
        $('<li ' + sClass + '><a href="#">' + j + '</a></li>').insertBefore($('li.next:first', an[i])[0]).bind 'click', (e) ->
          e.preventDefault()
          oSettings._iDisplayStart = (parseInt($('a', this).text(), 10) - 1) * oPaging.iLength
          fnDraw oSettings
          return
        j++
      if oPaging.iPage == 0
        $('li.prev', an[i]).addClass 'disabled'
      else
        $('li.prev', an[i]).removeClass 'disabled'
      if oPaging.iPage == oPaging.iTotalPages - 1 or oPaging.iTotalPages == 0
        $('li.next', an[i]).addClass 'disabled'
      else
        $('li.next', an[i]).removeClass 'disabled'
      i++
    return
