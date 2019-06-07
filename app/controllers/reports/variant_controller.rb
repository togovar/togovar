module Reports
  class VariantController < ApplicationController
    def show(id)
      config = Rails.configuration.endpoint
      default = {
        api: config['sparqlist'],
        ep: config['triplestore']
      }.compact

      search_api = config['sparqlist'].present? ? URI.parse(config['sparqlist']).merge('/') : nil

      @header = ['variant_header', default.merge(tgv_id: id)]

      @stanzas = [
        ['variant_summary', nil, default.merge(tgv_id: id)],
        ['variant_other_alternative_alleles', 'Other alternative allele(s)', default.merge(tgv_id: id, api: search_api).compact],
        ['variant_frequency', 'Frequency', default.merge(tgv_id: id)],
        ['variant_clinvar', 'Clinical Significance', default.merge(tgv_id: id)],
        ['variant_jbrowse', 'Genomic context', default.merge(tgv_id: id, assembly: 'GRCh37')],
        ['variant_gene', 'Gene', default.merge(tgv_id: id, assembly: 'GRCh37')],
        ['variant_transcript', 'Transcripts', default.merge(tgv_id: id)],
        ['variant_publication', 'Publications', default.merge(tgv_id: id)]
      ]
    end
  end
end
