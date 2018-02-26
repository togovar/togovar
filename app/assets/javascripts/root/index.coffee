window.drawInfo = {}

Array::unique = ->
  output = {}
  output[@[key]] = @[key] for key in [0...@length]
  value for key, value of output

jQuery ($) ->
  $('#result').dataTable
    retrieve: true,
    processing: true
    serverSide: true
    searching: false
    ordering: false
    scrollX: true
    scrollCollapse: true
    sDom: '<"top"flp>rt<"bottom"i><"clear">'
    ajax:
      url: 'list.json'
      data: (d) ->
        d.term = $('#search_text').val()
        d
    columns: [
## Base Information
      {
        data: 'tgv_id'
        render: (data, type, row, meta) ->
          if type == 'display'
            allele_id = row['clinvar_info']['allele_id']
            unless allele_id?
              return 'tgv' + data
            return '<a target="_blank" href="variation?allele_id=' + allele_id + '">tgv' + data + '</a>'
          else
            return data
      }
      {
        data: '.base.existing_variation'
      }
      {
        data: '.base.variant_class'
      }
      {
        data: '.base.chromosome'
        className: 'dt-body-right'
      }
      {
        data: '.base.position'
        className: 'dt-body-right'
      }
      {
# ref
        data: null
        render: (data, type, row, meta) ->
          return ''
      }
      {
        data: '.base.allele'
      }
## End Base Information

## Molecular Annotation
      {
        data: '.molecular_annotation.symbol'
      }
      {
        data: '.molecular_annotation.transcripts.[].consequences.[].label'
        render: (data, type, row, meta) ->
          if type == 'display'
            consequences = [].concat.apply([], data).unique()
            return '<ul>' + ('<li>' + label + '</li>' for label in consequences).join('') + '</ul>';
          else
            return data
      }
## End Molecular Annotation

## ClinVar Annotation
      {
        data: '.clinvar_info.conditions'
        defaultContent: ''
        render: (data, type, row, meta) ->
          if type == 'display'
            unless data?
              return ''
            return '<ul>' + ('<li>' + label + '</li>' for label in data).join('') + '</ul>';
          else
            return data
      }
      {
        data: '.clinvar_info.significance'
        defaultContent: ''
      }
## End ClinVar Annotation

## JGA
      {
        data: '.jga.num_alt_alleles'
        defaultContent: ''
        className: 'dt-body-right'
      }
      {
        data: '.jga.frequency'
        defaultContent: ''
        className: 'dt-body-right'
      }
## End JGA

## ToMMo
      {
        data: null
        render: (data, type, row, meta) ->
          return ''
      }
      {
        data: null
        render: (data, type, row, meta) ->
          return ''
      }
## End ToMMo

## HGVD
      {
        data: null
        render: (data, type, row, meta) ->
          return ''
      }
      {
        data: null
        render: (data, type, row, meta) ->
          return ''
      }
## End HGVD

## ExAC
# TODO fix wrong key
      {
        data: '.clinvar.num_alt_alleles'
        defaultContent: ''
        className: 'dt-body-right'
      }
      {
        data: '.clinvar.frequency'
        defaultContent: ''
        className: 'dt-body-right'
      }
## End ExAC

## Function
      {
        data: '.molecular_annotation.transcripts.[].sift'
        render: (data, type, row, meta) ->
          if type == 'display'
            list = data.filter (x) -> x
            return '<ul>' + ('<li>' + sift.prediction + '(' + sift.value + ')' + '</li>' for sift in list).join('') + '</ul>'
          else
            return data
      }
      {
        data: null
        render: (data, type, row, meta) ->
          return ''
      }
## End Function
    ]
  return

# on ready
$ ->
  $('#search_text').autocomplete
    source: (request, response) ->
      $.getJSON 'suggest.json', { term: request.term }, response
      return
    minLength: 3
    messages:
      noResults: 'No match'
      results: ->
    focus: (event, ui) ->
      false
    select: (event, ui) ->
      $('#search_text').val ui.item[0]
      $('#result').DataTable().draw()
      false
  .autocomplete('instance')._renderItem = (ul, item) ->
    $('<li>').append('<div><span class="text-muted">[' + item[1] + ']</span> ' + item[0] + '</div>').appendTo ul

  $('#btn_search').on 'click', ->
    $('#result').DataTable().draw()

  $('#btn_clear').on 'click', ->
    $('#search_text').val('')
    $('#result').DataTable().draw()

  # query examples
  $('#ex_disease').on 'click', ->
    $('#search_text').val('Breast-ovarian cancer')
    $('#result').DataTable().draw()
    return false
  $('#ex_gene').on 'click', ->
    $('#search_text').val('BRCA2')
    $('#result').DataTable().draw()
    return false
  $('#ex_rs').on 'click', ->
    $('#search_text').val('rs7988901')
    $('#result').DataTable().draw()
    return false
  $('#ex_tgv').on 'click', ->
    $('#search_text').val('tgv10000000')
    $('#result').DataTable().draw()
    return false
  $('#ex_position').on 'click', ->
    $('#search_text').val('13:32889080')
    $('#result').DataTable().draw()
    return false
  $('#ex_region').on 'click', ->
    $('#search_text').val('13:32889785-32889787')
    $('#result').DataTable().draw()
    return false

  $('#result').DataTable().draw()
