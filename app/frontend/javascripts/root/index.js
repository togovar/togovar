Array.prototype.unique = function () {
  var key, output, value, _i, _ref, _results;
  output = {};
  for (key = _i = 0, _ref = this.length; 0 <= _ref ? _i < _ref : _i > _ref; key = 0 <= _ref ? ++_i : --_i) {
    output[this[key]] = this[key];
  }
  _results = [];
  for (key in output) {
    value = output[key];
    _results.push(value);
  }
  return _results;
};

let popup_template = function () {
  return Template.table_row;
};

let gene_link = function (row) {
  if (row && (row.transcript != null)) {
    return row.transcript.map(function (x) {
      var href;
      if (x.hgnc_id != null) {
        href = "http://identifiers.org/hgnc/" + x.hgnc_id;
        return "<li><a target='_blank' href='" + href + "'>" + x.symbol + "</a></li>";
      }
      if (x.gene_id != null) {
        href = "http://identifiers.org/ensembl/" + x.gene_id;
        return "<li><a target='_blank' href='" + href + "'>" + x.symbol + "</a></li>";
      } else {
        return null;
      }
    }).filter(function (x) {
      return x;
    }).unique().join('');
  }
};

let classify = function (data) {
  let f = data.frequency;
  let n = data.num_alt_alleles;
  if (n === 1) {
    return '1/7';
  } else if (n === 0 || f === 0) {
    return '0/7';
  } else if (f < 0.0001) {
    return '2/7';
  } else if (f < 0.001) {
    return '3/7';
  } else if (f < 0.01) {
    return '4/7';
  } else if (f < 0.05) {
    return '5/7';
  } else if (f < 0.5) {
    return '6/7';
  } else if (f >= 0.5) {
    return '7/7';
  } else {
    return 'null';
  }
};

let sift_class = function (v) {
  if (v < 0.05) {
    return 'deleterious';
  } else {
    return 'tolerated';
  }
};

let polyphen_class = function (v) {
  if (v > 0.908) {
    return 'probably_damaging';
  } else if (v > 0.446 && v <= 0.908) {
    return 'possibly_damaging';
  } else if (v <= 0.446) {
    return 'benign';
  } else {
    return 'unknown';
  }
};

let clear_total = function () {
  $("[id^='variant_type_cnt_']").text('');
  $("[id^='dataset_cnt_']").text('');
  $("[id^='significance_cnt_']").text('');
};

let display_float = function (v) {
  if (v === 0) {
    return v = '0.0';
  } else if (v === 1) {
    return v = '1.0';
  } else if (v < 0.001) {
    return v = v.toExponential(3);
  } else {
    return v = Math.round(v * Math.pow(10, 3)) / Math.pow(10, 3);
  }
};

let update_total = function (variant_type, dataset, significance) {
  var key, v, x, _i, _j, _k, _len, _len1, _len2, _ref, _ref1, _ref2, _results;
  clear_total();
  _ref = ['jga_ngs', 'jga_snp', 'tommo', 'hgvd', 'exac', 'clinvar'];
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    x = _ref[_i];
    v = dataset[x] ? dataset[x] : 0;
    if ($('#source_' + x).prop('checked')) {
      $('#dataset_cnt_' + x).text('(' + v.toLocaleString() + ')');
    }
  }
  _ref1 = ['snv', 'insertion', 'deletion', 'indel', 'substitution'];
  for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
    x = _ref1[_j];
    v = variant_type[x] ? variant_type[x] : 0;
    if ($('#variant_type_' + x).prop('checked')) {
      $('#variant_type_cnt_' + x).text('(' + v.toLocaleString() + ')');
    }
  }
  _ref2 = ['not_in_clinvar', 'affects', 'association', 'benign', 'conflicting_data_from_submitters', 'conflicting_interpretations_of_pathogenicity', 'drug_response', 'likely_benign', 'likely_pathogenic', 'not_provided', 'other', 'pathogenic', 'protective', 'risk_factor', 'uncertain_significance'];
  _results = [];
  for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
    x = _ref2[_k];
    key = x.replace(/_/g, ' ');
    v = significance[key] ? significance[key] : 0;
    if ($('#significance_' + x).prop('checked')) {
      _results.push($('#significance_cnt_' + x).text('(' + v.toLocaleString() + ')'));
    } else {
      _results.push(void 0);
    }
  }
  return _results;
};

let show_warning = function (message) {
  var html;
  html = message ? '<div class="alert alert-warning" role="alert"><strong>Warning!</strong> ' + message + '</div>' : '';
  $('#search-alert').html(html);
};

let popup_html = function (row) {
  var html = popup_template();
  ['JGA-NGS', 'JGA-SNP', 'ToMMo', 'HGVD', 'ExAC'].forEach(function (source) {
    if (row.frequency) {
      let v = row.frequency.filter(y => y.source === source)[0];
      if (v) {
        key = source.toLocaleLowerCase().replace('-', '_')
        html = html.replace("{{" + key + ".alt}}", v.num_alt_alleles);
        html = html.replace("{{" + key + ".total}}", v.num_alleles);
        html = html.replace("{{" + key + ".freq}}", display_float(v.frequency));
      }
    }
  });
  html = html.replace(/{{[^{}]+}}/g, '-');
  return html;
};

$(document).ready(function () {

  $('#search_text').autocomplete({
    source: function (request, response) {
      $.getJSON('suggest.json', {
        term: request.term
      }, response);
    },
    minLength: 3,
    messages: {
      noResults: 'No match',
      results: function () {
      }
    },
    focus: function (event, ui) {
      return false;
    },
    select: function (event, ui) {
      $('#search_text').val(ui.item[0]);
      $('#result').DataTable().draw();
      return false;
    }
  }).keyup(function (e) {
    if (e.keyCode === 13) {
      $('.ui-menu-item').hide();
      return $('#result').DataTable().draw();
    }
  }).autocomplete('instance')._renderItem = function (ul, item) {
    return $('<li>').append('<div><span class="text-muted">[' + item[1] + ']</span> ' + item[0] + '</div>').appendTo(ul);
  };

  $('#btn_search').on('click', function () {
    return $('#result').DataTable().draw();
  });

  $('#btn_clear').on('click', function () {
    $('#search_text').val('');
    return $('#result').DataTable().draw();
  });

  $('#ex_disease').on('click', function () {
    $('#search_text').val('Breast-ovarian cancer, familial 2');
    $('#result').DataTable().draw();
    return false;
  });

  $('#ex_gene').on('click', function () {
    $('#search_text').val('ALDH2');
    $('#result').DataTable().draw();
    return false;
  });

  $('#ex_rs').on('click', function () {
    $('#search_text').val('rs114202595');
    $('#result').DataTable().draw();
    return false;
  });

  $('#ex_tgv').on('click', function () {
    $('#search_text').val('tgv421843');
    $('#result').DataTable().draw();
    return false;
  });

  $('#ex_position').on('click', function () {
    $('#search_text').val('16:48258198');
    $('#result').DataTable().draw();
    return false;
  });

  $('#ex_region').on('click', function () {
    $('#search_text').val('10:73270743-73376976');
    $('#result').DataTable().draw();
    return false;
  });

  $('input[name=source_all]').on('click', function () {
    $('input[name=source]').prop('checked', $('input[name=source_all]').prop('checked'));
    $('#result').DataTable().draw();
  });

  $('input[name=source]').on('click', function () {
    if ($('input[name=source]:not(:checked)').size() === 0) {
      $('input[name=source_all]').prop('checked', true);
    } else {
      $('input[name=source_all]').prop('checked', false);
    }
    $('#result').DataTable().draw();
  });

  $('input[name=variant_type_all]').on('click', function () {
    $('input[name=variant_type]').prop('checked', $('input[name=variant_type_all]').prop('checked'));
    $('#result').DataTable().draw();
  });

  $('input[name=variant_type]').on('click', function () {
    if ($('input[name=variant_type]:not(:checked)').size() === 0) {
      $('input[name=variant_type_all]').prop('checked', true);
    } else {
      $('input[name=variant_type_all]').prop('checked', false);
    }
    $('#result').DataTable().draw();
  });

  $('input[name=significance_all]').on('click', function () {
    $('input[name=significance]').prop('checked', $('input[name=significance_all]').prop('checked'));
    $('#result').DataTable().draw();
  });

  $('input[name=significance]').on('click', function () {
    if ($('input[name=significance]:not(:checked)').size() === 0) {
      $('input[name=significance_all]').prop('checked', true);
    } else {
      $('input[name=significance_all]').prop('checked', false);
    }
    $('#result').DataTable().draw();
  });

  $('#result').DataTable({
    language: {
      emptyTable: 'No variants found',
      info: 'Showing _START_ to _END_ of _TOTAL_ variants <strong id="dataTables_info_condition"></strong>',
      infoEmpty: 'Showing 0 to 0 of 0 variants',
      infoFiltered: '(filtered from _MAX_ variants)',
      lengthMenu: 'Display _MENU_ variants per page',
      zeroRecords: 'No matching variants found'
    },
    ajax: {
      url: Routes.list_path({format: 'json'}),
      type: 'POST',
      data: function (d) {
        d.term = $('#search_text').val();
        d.source = $('input[name^=source]:checked').map(function () {
          return $(this).val();
        }).get();
        d.freq_source = $('select[name=frequency_data_source] option:selected').map(function () {
          return $(this).val();
        }).get();
        d.freq_relation = $('select[name=frequency_relation] option:selected').map(function () {
          return $(this).val();
        }).get();
        d.freq_value = $('input[name=frequency]').map(function () {
          return $(this).val();
        }).get();
        d.variant_type = $('input[name^=variant_type]:checked').map(function () {
          return $(this).val();
        }).get();
        d.significance = $('input[name^=significance]:checked').map(function () {
          return $(this).val();
        }).get();
      },
      beforeSend: function (xhr) {
        xhr.setRequestHeader('X-CSRF-Token', $('meta[name="csrf-token"]').attr('content'));
      }
    },
    preDrawCallback: function (settings) {
      $('[data-toggle="tooltip"]').tooltip('dispose');
    },
    callback: function (settings) {
      $('#dataTables_info_condition').text(settings.json.condition || '');
      let total_variant_type = settings.json.total_variant_type;
      let total_dataset = settings.json.total_dataset;
      let total_significance = settings.json.total_significance;
      update_total(total_variant_type, total_dataset, total_significance);
      show_warning(settings.json.warning);
      $('[data-toggle="tooltip"]').tooltip();
    },
    columns: [
      {
        data: 'variant_type',
        render: function (data, type, row, meta) {
          if (type === 'display') {
            if (data) {
              data = '<span data-icon="variant_type_' + data.replace(/\ /g, '_').toLowerCase() + '" />';
            }
          }
          return data;
        }
      }, {
        data: 'tgv_id',
        render: function (data, type, row, meta) {
          if (type === 'display') {
            let html = '<ul>';
            let tgv_id = "<a target='_blank' href='" + (Routes.variant_path('tgv' + data)) + "'>tgv" + data + "</a>";
            html = html.concat('<li>', tgv_id, '</li>');
            if (row && row.rs) {
              let rs_id = "<a class='text-muted' target='_blank' href='http://identifiers.org/dbsnp/rs" + row.rs + "'>rs" + row.rs + "</a>";
              html = html.concat('<li>', rs_id, '</li>');
            }
            html = html.concat('</ul>');
            data = html;
          }
          return data;
        }
      }, {
        data: 'start',
        render: function (data, type, row, meta) {
          if (type === 'display') {
            if (row && row.chromosome) {
              data = row.chromosome + ":" + data;
            }
          }
          return data;
        }
      }, {
        data: 'reference',
        defaultContent: '',
        render: function (data, type, row, meta) {
          if (type === 'display') {
            if (data && data.length > 4) {
              data = '<span title="' + data + '">' + data.substr(0, 4).concat('...') + '<br><span class="text-muted">(' + data.length + ')</span></span>';
            }
          }
          return data;
        }
      }, {
        data: 'alternative',
        defaultContent: '',
        render: function (data, type, row, meta) {
          if (type === 'display') {
            if (data && data.length > 4) {
              data = '<span title="' + data + '">' + data.substr(0, 4).concat('...') + '<br><span class="text-muted">(' + data.length + ')</span></span>';
            }
          }
          return data;
        }
      }, {
        data: 'transcript.[].symbol',
        render: function (data, type, row, meta) {
          if (type === 'display') {
            if (data) {
              data = "<ul>" + (gene_link(row)) + "</ul>";
            }
          }
          return data;
        }
      }, {
        data: null,
        defaultContent: '',
        "class": 'text-center',
        render: function (data, type, row, meta) {
          let html;
          if (type === 'display') {
            html = '<div class="frequency_wrapper" data-toggle="tooltip" data-placement="bottom" data-html="true" title="' + popup_html(row) + '">';
            ['JGA-NGS', 'JGA-SNP', 'ToMMo', 'HGVD', 'ExAC'].forEach(x => {
              let v = row.frequency ? row.frequency.filter(y => y.source === x)[0] : null;
              let klass = v ? classify(v) : 'null';
              html = html.concat('<span data-source="' + x.toLocaleLowerCase().replace('-', '_') + '" data-frequency="' + klass + '"></span>');
            });
            data = html.concat('</div>');
          }
          return data;
        }
      }, {
        data: 'most_severe_consequence'
      }, {
        data: 'transcript.[].sift',
        render: function (data, type, row, meta) {
          if (type === 'display') {
            if (data) {
              let arr = data.filter(function (x) {
                return x || x === 0;
              });
              if (arr.length !== 0) {
                let v = Math.min.apply(null, arr);
                data = "<span data-icon='sift_" + (sift_class(v)) + "'>" + (display_float(v)) + "</div>";
              } else {
                data = '';
              }
            }
          }
          return data;
        }
      }, {
        data: 'transcript.[].polyphen',
        render: function (data, type, row, meta) {
          if (type === 'display') {
            if (data) {
              let arr = data.filter(function (x) {
                return x || x === 0;
              });
              if (arr.length !== 0) {
                let v = Math.max.apply(null, arr);
                data = "<span data-icon='polyphen_" + (polyphen_class(v)) + "'>" + (display_float(v)) + "</div>";
              } else {
                data = '';
              }
            }
          }
          return data;
        }
      }, {
        data: 'condition.[]',
        defaultContent: '',
        render: function (data, type, row, meta) {
          if (type === 'display') {
            if (data) {
              data = '<ul>' + data.map(x => '<li><span data-icon="significance_' + x.interpretation[0].replace(/\ /g, '_') + '">' + x.condition + '</span></li>').join('') + '</ul>';
            }
          }
          return data;
        }
      }
    ]
  });

  let add_freq_filter = function () {
    let html = Template.freq_filter;
    $('#freq_filter_wrapper').append(html);
    $(".remove_freq_filter").on('click', function () {
      $(this).parent().remove();
    });
  };

  $("#add_freq_filter").on('click', function () {
    add_freq_filter();
  });

  $("#update_freq_filter").on('click', function () {
    $('#result').DataTable().draw();
  });

  add_freq_filter();

});
