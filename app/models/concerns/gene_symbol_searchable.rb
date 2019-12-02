module GeneSymbolSearchable
  extend ActiveSupport::Concern

  included do
    include Elasticsearch::Model

    index_name :gene_symbols

    config = Rails.configuration.elasticsearch

    settings = {
      index: {
        number_of_shards: config.dig('indices', 'gene_symbols', 'number_of_shards') || 1,
        number_of_replicas: config.dig('indices', 'gene_symbols', 'number_of_replicas') || 0
      },
      analysis: {
        analyzer: {
          symbol_search_analyzer: {
            type: :custom,
            tokenizer: :whitespace,
            filter: :lowercase
          },
          symbol_suggest_analyzer: {
            type: :custom,
            tokenizer: :whitespace,
            filter: %i[lowercase edge_ngram_filter]
          }
        },
        filter: {
          edge_ngram_filter: {
            type: :edge_ngram,
            min_gram: 3,
            max_gram: 20
          }
        },
        normalizer: {
          lowercase: {
            type: :custom,
            filter: :lowercase
          }
        }
      }
    }

    settings settings do
      mapping dynamic: false do
        indexes :gene_id, type: :keyword
        indexes :symbol,
                type: :keyword,
                fields: {
                  search: {
                    type: :text,
                    analyzer: :symbol_search_analyzer
                  },
                  suggest: {
                    type: :text,
                    analyzer: :symbol_suggest_analyzer
                  },
                  lowercase: {
                    type: :keyword,
                    normalizer: :lowercase
                  }
                }
        indexes :symbol_source,
                type: :keyword,
                fields: {
                  lowercase: {
                    type: :keyword,
                    normalizer: :lowercase
                  }
                }
        indexes :alias_of,
                type: :keyword,
                fields: {
                  lowercase: {
                    type: :keyword,
                    normalizer: :lowercase
                  }
                }
      end
    end
  end
end
