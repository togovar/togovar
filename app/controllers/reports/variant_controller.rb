module Reports
  class VariantController < ApplicationController
    def show(id)
      config = Rails.configuration.endpoint

      params = {
        tgv_id: id,
        sparql: config['sparql'].presence,
        sparqlist: config['sparqlist'].presence,
        base_url: config['stanza'].presence
      }.compact

      search = config['search'].presence
      jbrowse = config['jbrowse'].presence

      @header = { id: id, stanza: ['variant_header', params] }

      @stanzas = [
        ['variant_summary', nil, params],
        ['variant_other_overlapping_variants', 'Other overlapping variant(s)', params.merge(search_api: search).compact],
        ['variant_frequency', 'Frequency', params],
        ['variant_clinvar', 'Clinical Significance', params],
        ['variant_jbrowse', 'Genomic context', params.merge(assembly: 'GRCh37', jbrowse: jbrowse).compact],
        ['variant_gene', 'Gene', params.merge(assembly: 'GRCh37')],
        ['variant_transcript', 'Transcripts', params.merge(assembly: 'GRCh37')],
        ['variant_publication', 'Publications', params]
      ]
    end
  end
end
