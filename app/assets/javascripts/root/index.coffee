Array::unique = ->
  output = {}
  output[@[key]] = @[key] for key in [0...@length]
  value for key, value of output

$ ->
  $('#search_text').autocomplete
    source: (request, response) ->
      $.getJSON 'suggest.json', {term: request.term}, response
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
  # -> TO HERE $('#search_text').autocomplete

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
