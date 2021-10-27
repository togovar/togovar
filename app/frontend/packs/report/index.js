import 'jquery'

$(function () {
  const id = window.location.pathname.split('/').pop();
  const base_options = {
    tgv_id: id,
    ep: TOGOVAR_ENDPOINT_SPARQL,
    sparqlist: TOGOVAR_ENDPOINT_SPARQLIST,
  };
  const stanza = [
    $('<togostanza-variant_header></togostanza-variant_header>').attr(base_options),
    $('<togostanza-variant_summary></togostanza-variant_summary>').attr(base_options),
    $('<togostanza-variant_other_overlapping_variants></togostanza-variant_other_overlapping_variants>').attr(base_options).attr({search_api: TOGOVAR_ENDPOINT_SEARCH}),
    $('<togostanza-variant_frequency></togostanza-variant_frequency>').attr(base_options),
    $('<togostanza-variant_clinvar></togostanza-variant_clinvar>').attr(base_options),
    $('<togostanza-variant_jbrowse></togostanza-variant_jbrowse>').attr(base_options).attr({assembly: "GRCh37", jbrowse: TOGOVAR_ENDPOINT_JBROWSE, margin: "50"}),
    $('<togostanza-variant_gene></togostanza-variant_gene>').attr(base_options),
    $('<togostanza-variant_transcript></togostanza-variant_transcript>').attr(base_options),
    $('<togostanza-variant_publication></togostanza-variant_publication>').attr(base_options),
  ];

  $('.report_id').html(id);
  stanza.forEach((value, index, array) => $(`#_stanza_${index}`).append(value));
});
