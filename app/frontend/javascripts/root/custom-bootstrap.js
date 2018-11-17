$.extend($.fn.dataTable.defaults, {
  retrieve: true,
  processing: true,
  serverSide: true,
  ordering: false,
  searching: false,
  scrollX: true,
  pageLength: 25,
  dom: "l<<i>p><'#download-container'>rtilp",
  pagingType: "custom-bootstrap",
  paginationSlider: null,
  ajax: {
    error: function () {
      alert("failing query...");
    }
  },
  drawCallback: function (settings) {
    const PAGENATION_MAX = 5;
    const PAGENATION_MARGIN = 2;

    let api = this.api();
    let pane = $('#result_wrapper');
    let tmpPaginationSlider = settings.oInit.paginationSlider;

    if (!tmpPaginationSlider) {
      let html = "<div class='pagination-slider'>\n  <div class='pagination-slider-bar'></div>\n  <div class='pagination-slider-current-bar'></div>\n  <div class='pagination-slider-indicator'>\n    <div class='inner'>0</div>\n  </div>\n  <div class='pagination-slider-dotted-line-left'></div>\n  <div class='pagination-slider-dotted-line-right'></div>\n</div>";
      let ul = pane.find(".dataTables_paginate ul");
      ul.before(html);

      tmpPaginationSlider = {
        ul: ul,
        container: pane.find(".pagination-slider"),
        bar: pane.find(".pagination-slider-bar"),
        currentBar: pane.find(".pagination-slider-current-bar"),
        indicator: pane.find(".pagination-slider-indicator"),
        indicatorInner: pane.find(".pagination-slider-indicator > .inner"),
        dottedLineLeft: pane.find(".pagination-slider-dotted-line-left"),
        dottedLineRight: pane.find(".pagination-slider-dotted-line-right"),
        pagination: pane.find(".pagination")
      };

      tmpPaginationSlider.indicator.mousedown(function (e) {
        let startX = e.clientX;
        let originX = tmpPaginationSlider.indicator.position().left;
        let maxWidth = tmpPaginationSlider.bar.outerWidth();
        let unit = maxWidth / tmpPaginationSlider.totalPage;
        let page = 0;

        $(window).on("mousemove.paginationSlider", function (e) {
          let x = originX + e.clientX - startX;
          x = (x < 0 ? 0 : x);
          x = (x > maxWidth ? maxWidth : x);
          tmpPaginationSlider.indicator.css("left", x + "px");
          x = (x < unit * .5 ? unit * .5 : x);
          x = (x > maxWidth - unit * .5 ? maxWidth - unit * .5 : x);
          page = Math.floor(x / unit);
          tmpPaginationSlider.currentPage = page;
          tmpPaginationSlider.indicatorInner.text(page + 1);
          tmpPaginationSlider.setPaginationRange();
          tmpPaginationSlider.render();
        }).on("mouseup.paginationSlider", function (e) {
          $(window).off("mousemove.paginationSlider mouseup.paginationSlider");
          api.page(page).draw(false);
        });
      });

      tmpPaginationSlider.setPaginationRange = function () {
        tmpPaginationSlider.startPage = tmpPaginationSlider.currentPage - PAGENATION_MARGIN;
        tmpPaginationSlider.startPage = (tmpPaginationSlider.startPage < 0 ? 0 : tmpPaginationSlider.startPage);
        if ((tmpPaginationSlider.startPage + tmpPaginationSlider.displayPagination) > tmpPaginationSlider.totalPage) {
          tmpPaginationSlider.startPage = tmpPaginationSlider.totalPage - tmpPaginationSlider.displayPagination;
        }
      };

      tmpPaginationSlider.render = function () {
        let bw = tmpPaginationSlider.bar.width();
        tmpPaginationSlider.indicatorInner.text(tmpPaginationSlider.currentPage + 1);
        tmpPaginationSlider.indicator.css("left", Math.round(bw * (tmpPaginationSlider.currentPage + .5) / tmpPaginationSlider.totalPage) + "px");
        let cw = Math.ceil(bw * (tmpPaginationSlider.displayPagination / tmpPaginationSlider.totalPage));
        let bl = Math.floor(bw * (tmpPaginationSlider.startPage / tmpPaginationSlider.totalPage));
        tmpPaginationSlider.currentBar.width(cw).css("left", bl + "px");
        let $pThird = tmpPaginationSlider.ul.children("li:nth-child(3)");
        let $pLastThird = tmpPaginationSlider.ul.children("li:nth-last-child(3)");
        let br = bl + cw;
        let bb = tmpPaginationSlider.bar.position().top + tmpPaginationSlider.bar.outerHeight();
        let pl = tmpPaginationSlider.ul.position().left + $pThird.position().left;
        let pr = tmpPaginationSlider.ul.position().left + $pLastThird.position().left + $pLastThird.outerWidth();
        let pt = tmpPaginationSlider.ul.position().top - tmpPaginationSlider.container.position().top + $pThird.outerHeight() * .5;
        let lLength = Math.sqrt(Math.pow(pl - bl, 2) + Math.pow(pt - bb, 2));
        let rad = Math.atan2(pt - bb, pl - bl);
        let deg = (180 * rad) / Math.PI;
        tmpPaginationSlider.dottedLineLeft.width(lLength).height(1).css({
          top: ((pt + bb) * .5) + "px",
          left: ((pl + bl) * .5 - lLength * .5) + "px",
          transform: "rotate(" + deg + "deg)"
        });
        let rLength = Math.sqrt(Math.pow(pr - br, 2) + Math.pow(pt - bb, 2));
        rad = Math.atan2(pt - bb, pr - br);
        deg = (180 * rad) / Math.PI;
        tmpPaginationSlider.dottedLineRight.width(rLength).height(1).css({
          top: ((pt + bb) * .5) + "px",
          left: ((pr + br) * .5 - rLength * .5) + "px",
          transform: "rotate(" + deg + "deg)"
        });
      };

      $(window).resize(function () {
        tmpPaginationSlider.render();
      });
    }

    let iLength = this.api().page.info().length;
    tmpPaginationSlider.totalDisplayRecords = this.api().page.info().recordsTotal;
    tmpPaginationSlider.totalPage = this.api().page.info().pages;
    tmpPaginationSlider.displayPagination = tmpPaginationSlider.totalPage;
    tmpPaginationSlider.displayPagination = (tmpPaginationSlider.displayPagination > PAGENATION_MAX ? PAGENATION_MAX : tmpPaginationSlider.displayPagination);
    tmpPaginationSlider.currentPage = Math.floor(this.api().page.info().start / iLength);
    tmpPaginationSlider.setPaginationRange();

    if (tmpPaginationSlider.totalDisplayRecords <= iLength) {
      tmpPaginationSlider.pagination.hide();
    } else {
      tmpPaginationSlider.pagination.show();
      tmpPaginationSlider.render();
    }
    settings.oInit.paginationSlider = tmpPaginationSlider;

    if (settings.oInit.callback) {
      settings.oInit.callback(settings);
    }
  }
});

$.fn.dataTableExt.oApi.fnPagingInfo = function (oSettings) {
  return {
    'iStart': oSettings._iDisplayStart,
    'iEnd': oSettings.fnDisplayEnd(),
    'iLength': oSettings._iDisplayLength,
    'iTotal': oSettings.fnRecordsTotal(),
    'iFilteredTotal': oSettings.fnRecordsDisplay(),
    'iPage': oSettings._iDisplayLength === -1 ? 0 : Math.ceil(oSettings._iDisplayStart / oSettings._iDisplayLength),
    'iTotalPages': oSettings._iDisplayLength === -1 ? 0 : Math.ceil(oSettings.fnRecordsDisplay() / oSettings._iDisplayLength)
  };
};

$.extend($.fn.dataTableExt.oPagination, {
  'custom-bootstrap': {
    'fnInit': function (oSettings, nPaging, fnDraw) {
      var els, fnClickHandler, oLang;
      oLang = oSettings.oLanguage.oPaginate;
      fnClickHandler = function (e) {
        e.preventDefault();
        if (oSettings.oApi._fnPageChange(oSettings, e.data.action)) {
          fnDraw(oSettings);
        }
      };
      $(nPaging).addClass('pagination').append('<ul>' + '<li class="prev disabled"><a href="#">«</a></li>' + '<li class="prev disabled"><a href="#">‹</a></li>' + '<li class="next disabled"><a href="#">›</a></li>' + '<li class="next disabled"><a href="#">»</a></li>' + '</ul>');
      els = $('a', nPaging);
      $(els[0]).bind('click.DT', {
        action: 'first'
      }, fnClickHandler);
      $(els[1]).bind('click.DT', {
        action: 'previous'
      }, fnClickHandler);
      $(els[2]).bind('click.DT', {
        action: 'next'
      }, fnClickHandler);
      $(els[3]).bind('click.DT', {
        action: 'last'
      }, fnClickHandler);
    },
    'fnUpdate': function (oSettings, fnDraw) {
      var an, i, iEnd, iHalf, iLen, iListLength, iStart, j, oPaging, sClass;
      iListLength = 5;
      oPaging = oSettings.oInstance.fnPagingInfo();
      an = oSettings.aanFeatures.p;
      i = void 0;
      j = void 0;
      sClass = void 0;
      iStart = void 0;
      iEnd = void 0;
      iHalf = Math.floor(iListLength / 2);
      if (oPaging.iTotalPages < iListLength) {
        iStart = 1;
        iEnd = oPaging.iTotalPages;
      } else if (oPaging.iPage <= iHalf) {
        iStart = 1;
        iEnd = iListLength;
      } else if (oPaging.iPage >= oPaging.iTotalPages - iHalf) {
        iStart = oPaging.iTotalPages - iListLength + 1;
        iEnd = oPaging.iTotalPages;
      } else {
        iStart = oPaging.iPage - iHalf + 1;
        iEnd = iStart + iListLength - 1;
      }
      i = 0;
      iLen = an.length;
      while (i < iLen) {
        $('li:gt(1)', an[i]).filter(':not(.next)').remove();
        j = iStart;
        while (j <= iEnd) {
          sClass = j === oPaging.iPage + 1 ? 'class="active"' : '';
          $('<li ' + sClass + '><a href="#">' + j + '</a></li>').insertBefore($('li.next:first', an[i])[0]).bind('click', function (e) {
            e.preventDefault();
            oSettings._iDisplayStart = (parseInt($('a', this).text(), 10) - 1) * oPaging.iLength;
            fnDraw(oSettings);
          });
          j++;
        }
        if (oPaging.iPage === 0) {
          $('li.prev', an[i]).addClass('disabled');
        } else {
          $('li.prev', an[i]).removeClass('disabled');
        }
        if (oPaging.iPage === oPaging.iTotalPages - 1 || oPaging.iTotalPages === 0) {
          $('li.next', an[i]).addClass('disabled');
        } else {
          $('li.next', an[i]).removeClass('disabled');
        }
        i++;
      }
    }
  }
});
