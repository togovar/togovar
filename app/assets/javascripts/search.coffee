window.drawInfo = {}

jQuery ($) ->
  $('#result_gene').dataTable
    retrieve: true,
    processing: true
    serverSide: true
    searching: false
    ajax:
      url: "report_type/gene"
      data: (d) ->
        d.type = 'gene'
        d.term = $('#search_text').val()
        d
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

  $('#result_disease').dataTable
    retrieve: true,
    processing: true
    serverSide: true
    searching: false
    ajax:
      url: "report_type/disease"
      data: (d) ->
        d.type = 'disease'
        d.term = $('#search_text').val()
        d
    columns: [
      {
        data: "variation"
        render: (data, type, row, meta) ->
          if(type == 'display')
            slp = data.split('/')
            id = slp[slp.length - 1]
            data = '<a href="/clin_var/' + id + '" target="_blank">' + slp[slp.length - 1] + '</a>';
          return data;
      }
      { data: "location" }
      { data: "phenotype" }
      { data: "submission_num" }
      { data: "allele_num" }
    ]

  $('#result_variation').dataTable
    retrieve: true,
    processing: true
    serverSide: true
    searching: false
    ajax:
      url: "report_type/variation"
      data: (d) ->
        d.type = 'variation'
        d.term = $('#search_text').val()
        d
    columns: [
      {
        data: "variant"
        render: (data, type, row, meta) ->
          if(type == 'display')
            slp = data.split('/')
            id = slp[slp.length - 1]
            data = '<a href="/exac/' + id + '" target="_blank">' + slp[slp.length - 1] + '</a>';
          return data;
      }
      { data: "chr" }
      { data: "position" }
      { data: "filter" }
      { data: "annotation" }
      { data: "allele_count" }
      { data: "allele_num" }
      { data: "allele_frequency" }
    ]

$ ->
  $('#result_gene').DataTable().draw()

$ ->
  $('#result_disease').DataTable().draw()

$ ->
  $('#result_variation').DataTable().draw()

$ ->
  $('#btn_search').on 'click', ->
    sel = $('#search_type').val()
    switch sel
      when 'gene'
        $('.nav-tabs a[href="#tab_content_gene"]').tab('show')
        $('#result_gene').DataTable().draw()
      when 'disease'
        $('.nav-tabs a[href="#tab_content_disease"]').tab('show')
        $('#result_disease').DataTable().draw()
      when 'variation'
        $('.nav-tabs a[href="#tab_content_variation"]').tab('show')
        $('#result_variation').DataTable().draw()
      else
        console.warn('Unknown select option: ' + sel)
