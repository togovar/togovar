# Place all the behaviors and hooks related to the matching controller here.
# All this logic will automatically be available in application.js.
# You can use CoffeeScript in this file: http://coffeescript.org/
$ ->
  $('#search_box').autocomplete(
    minLength: 1
    source: "/disease/suggest.json?type=disease",
    focus: (event, ui) ->
      $('#search_box').val ui.item._source.name
      false
    select: (event, ui) ->
      $('#search_box').val ui.item._source.name
      false
  ).autocomplete('instance')._renderItem = (ul, item) ->
    $('<li>').append('<div>' + item._source.name + '<br><b>Type: </b>' + item._type + '</div>').appendTo ul
