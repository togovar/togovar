# Place all the behaviors and hooks related to the matching controller here.
# All this logic will automatically be available in application.js.
# You can use CoffeeScript in this file: http://coffeescript.org/
$ ->
  $('#search_text').autocomplete
    source: (request, response) ->
      $.getJSON '/disease/suggest.json', { term: request.term, type: $('#search_type').val() }, response
      return
    minLength: 1
    focus: (event, ui) ->
      false
    select: (event, ui) ->
      $('#search_text').val ui.item._source.name
      false
  .autocomplete('instance')._renderItem = (ul, item) ->
    $('<li>').append('<div>' + item._source.name + '</div>').appendTo ul

$ ->
  $('#search_type').change ->
    switch event.target.value
      when 'disease'
        $('#search_text').attr("placeholder", 'breast cancer')
      when 'variation'
        $('#search_text').attr("placeholder", '22:46615715-46615880')
      else
        $('#search_text').attr("placeholder", 'BRCA1')
    return
  return
