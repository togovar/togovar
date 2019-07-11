module GeneSymbolSearchable
  extend ActiveSupport::Concern

  included do
    include Elasticsearch::Model

    index_name :gene_symbols

    config = Rails.configuration.elasticsearch

    settings index: {
      number_of_shards: config.dig('indices', 'gene_symbols', 'number_of_shards') || 1,
      number_of_replicas: config.dig('indices', 'gene_symbols', 'number_of_replicas') || 0,
      analysis: {
        filter: {
          sugget_filter: {
            type: 'edge_ngram',
            min_gram: 3,
            max_gram: 20
          }
        },
        analyzer: {
          sugget_analyzer: {
            type: 'custom',
            tokenizer: 'standard',
            filter: %w[lowercase sugget_filter]
          }
        }
      }
    } do
      mapping dynamic: false do
        indexes :gene_id, type: :keyword
        indexes :symbol,
                type: :text,
                analyzer: 'sugget_analyzer',
                fields: {
                  raw: { type: :keyword }
                }
        indexes :symbol_source, type: :keyword
        indexes :alias_of, type: :keyword
      end
    end
  end
end
