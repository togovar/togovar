# Core component
#= require dataTables/jquery.dataTables

# Optional Datatables extensions
#= require dataTables/extras/dataTables.responsive
#= require dataTables/extras/dataTables.buttons

#= require custom-bootstrap

$ ->
  $.extend $.fn.dataTable.defaults,
    processing: true
    serverSide: true
    ordering: false
    searching: false
    scrollX: true
    pageLength: 25
    dom: "<'span10'<'span5'i><'span5'l>p><'.result-download-container.span2'>rtip"
    pagingType: "custom-bootstrap"
    paginationSlider: null
    ajax:
      data: (d) ->
        d.term = $('#search_text').val()
        return
      error: ->
        alert "failing query..."
        return
    drawCallback: (settings) ->
      api = @api()
      pane = $('#result_wrapper')

      # donwload link
      params = {}
      # settings.ajax.data params
      # url = "/list.json?" + $.param(params)
      # pane.find(".result-download-container > a").attr "href", url

      tmpPaginationSlider = settings.oInit.paginationSlider
      unless tmpPaginationSlider
        html = """
               <div class='pagination-slider'>
                 <div class='pagination-slider-bar'></div>
                 <div class='pagination-slider-current-bar'></div>
                 <div class='pagination-slider-indicator'>
                   <div class='inner'>0</div>
                 </div>
                 <div class='pagination-slider-dotted-line-left'></div>
                 <div class='pagination-slider-dotted-line-right'></div>
               </div>
               """

        $ul = pane.find(".dataTables_paginate ul")
        $ul.before(html)
        tmpPaginationSlider =
          ul: $ul
          container: pane.find(".pagination-slider")
          bar: pane.find(".pagination-slider-bar")
          currentBar: pane.find(".pagination-slider-current-bar")
          indicator: pane.find(".pagination-slider-indicator")
          indicatorInner: pane.find(".pagination-slider-indicator > .inner")
          dottedLineLeft: pane.find(".pagination-slider-dotted-line-left")
          dottedLineRight: pane.find(".pagination-slider-dotted-line-right")
          pagination: pane.find(".pagination")

        tmpPaginationSlider.indicator.mousedown (e) ->
          startX = e.clientX
          originX = tmpPaginationSlider.indicator.position().left
          maxWidth = tmpPaginationSlider.bar.outerWidth()
          unit = maxWidth / tmpPaginationSlider.totalPage
          page = undefined

          # number on indicator
          $(window).on("mousemove.paginationSlider", (e) ->
            x = originX + e.clientX - startX
            x = (if x < 0 then 0 else x)
            x = (if x > maxWidth then maxWidth else x)
            tmpPaginationSlider.indicator.css "left", x + "px"
            x = (if x < unit * .5 then unit * .5 else x)
            x = (if x > maxWidth - unit * .5 then maxWidth - unit * .5 else x)
            page = Math.floor(x / unit)
            tmpPaginationSlider.currentPage = page
            tmpPaginationSlider.indicatorInner.text page + 1
            tmpPaginationSlider.setPaginationRange()
            tmpPaginationSlider.render()
            return
          ).on "mouseup.paginationSlider", (e) ->
            $(window).off "mousemove.paginationSlider mouseup.paginationSlider"
            api.page(page).draw false
            return
          return

        # range for pagination
        tmpPaginationSlider.setPaginationRange = (currentPage) ->
          tmpPaginationSlider.startPage = tmpPaginationSlider.currentPage - PAGENATION_MARGIN
          tmpPaginationSlider.startPage = (if tmpPaginationSlider.startPage < 0 then 0 else tmpPaginationSlider.startPage)
          tmpPaginationSlider.startPage = tmpPaginationSlider.totalPage - tmpPaginationSlider.displayPagination  if (tmpPaginationSlider.startPage + tmpPaginationSlider.displayPagination) > tmpPaginationSlider.totalPage
          return

        tmpPaginationSlider.render = ->
          bw = tmpPaginationSlider.bar.width()

          # position
          tmpPaginationSlider.indicatorInner.text tmpPaginationSlider.currentPage + 1
          tmpPaginationSlider.indicator.css "left", Math.round(bw * (tmpPaginationSlider.currentPage + .5) / (tmpPaginationSlider.totalPage)) + "px"

          # position and size for bar
          cw = Math.ceil(bw * (tmpPaginationSlider.displayPagination / tmpPaginationSlider.totalPage))
          bl = Math.floor(bw * (tmpPaginationSlider.startPage / tmpPaginationSlider.totalPage))
          tmpPaginationSlider.currentBar.width(cw).css("left", bl + "px")

          # dotted line
          $pThird = tmpPaginationSlider.ul.children("li:nth-child(3)")
          $pLastThird = tmpPaginationSlider.ul.children("li:nth-last-child(3)")
          br = bl + cw
          bb = tmpPaginationSlider.bar.position().top + tmpPaginationSlider.bar.outerHeight()
          pl = tmpPaginationSlider.ul.position().left + $pThird.position().left
          pr = tmpPaginationSlider.ul.position().left + $pLastThird.position().left + $pLastThird.outerWidth()
          pt = tmpPaginationSlider.ul.position().top - tmpPaginationSlider.container.position().top + $pThird.outerHeight() * .5
          lLength = Math.sqrt(Math.pow(pl - bl, 2) + Math.pow(pt - bb, 2))
          rad = Math.atan2(pt - bb, pl - bl)
          deg = (180 * rad) / Math.PI
          tmpPaginationSlider.dottedLineLeft.width(lLength).height(1).css
            top: ((pt + bb) * .5) + "px"
            left: ((pl + bl) * .5 - lLength * .5) + "px"
            transform: "rotate(" + (deg + 0) + "deg)"

          rLength = Math.sqrt(Math.pow(pr - br, 2) + Math.pow(pt - bb, 2))
          rad = Math.atan2(pt - bb, pr - br)
          deg = (180 * rad) / Math.PI
          tmpPaginationSlider.dottedLineRight.width(rLength).height(1).css
            top: ((pt + bb) * .5) + "px"
            left: ((pr + br) * .5 - rLength * .5) + "px"
            transform: "rotate(" + (deg + 0) + "deg)"

          return

        $(window).resize ->
          tmpPaginationSlider.render()
          return

      PAGENATION_MAX = 5
      PAGENATION_MARGIN = 2

      iLength = @api().page.info().length

      tmpPaginationSlider.totalDisplayRecords = @api().page.info().recordsTotal
      tmpPaginationSlider.totalPage = @api().page.info().pages
      tmpPaginationSlider.displayPagination = tmpPaginationSlider.totalPage
      tmpPaginationSlider.displayPagination = (if tmpPaginationSlider.displayPagination > PAGENATION_MAX then PAGENATION_MAX else tmpPaginationSlider.displayPagination)

      currentPage = Math.floor(@api().page.info().start / iLength)
      tmpPaginationSlider.currentPage = currentPage
      tmpPaginationSlider.setPaginationRange()

      if tmpPaginationSlider.totalDisplayRecords <= iLength
        tmpPaginationSlider.pagination.hide()
      else
        tmpPaginationSlider.pagination.show()
        tmpPaginationSlider.render()

      settings.oInit.paginationSlider = tmpPaginationSlider

      if (settings.oInit.callback)
        settings.oInit.callback(settings)

      return
