window.drawInfo = {}

jQuery ($) ->
  $('#result_gene').dataTable
    retrieve: true,
    processing: true
    serverSide: true
    searching: false
    bInfo : false
    ajax:
      url: "report_type/gene"
      data: (d) ->
        d.type = 'gene'
        d.term = $('#search_box').val();
    columns: [
      {
        data: "togogenome"
        render: (data, type, row, meta) ->
          if(type == 'display')
            slp = data.split('/')
            id = slp[slp.length - 1]
            data = '<a href="/gene/' + id + '" target="_blank">' + slp[slp.length - 1] + '</a>';
          return data;
      }
      { data: "gene_name" }
    ]

$ ->
  $('#result_gene').DataTable().draw()

$ ->
  $('#btn_search').on 'click', ->
    $('#result_gene').DataTable()
      .page('next')
      .draw('page')
