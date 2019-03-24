module GeneSymbolSearchable
  extend ActiveSupport::Concern

  included do
    include Elasticsearch::Model

    index_name :gene_symbols

    config = Rails.configuration.elasticsearch

    settings index: {
      number_of_shards: config.dig('indices', 'gene_symbols', 'number_of_shards'),
      number_of_replicas: config.dig('indices', 'gene_symbols', 'number_of_replicas')
    } do
      mapping dynamic: false do
        indexes :gene_id, type: :keyword
        indexes :symbol,
                type: :keyword,
                fields: {
                  suggest: {
                    type: :completion
                  }
                }
        indexes :symbol_source, type: :keyword
        indexes :alias_of, type: :keyword
      end
    end
  end
end
