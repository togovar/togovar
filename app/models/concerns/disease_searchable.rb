module DiseaseSearchable
  extend ActiveSupport::Concern

  included do
    include Elasticsearch::Model

    index_name :diseases

    config = Rails.configuration.elasticsearch

    settings index: {
      number_of_shards: config.dig('indices', 'diseases', 'number_of_shards') || 1,
      number_of_replicas: config.dig('indices', 'diseases', 'number_of_replicas') || 0,
      analysis: {
        normalizer: {
          lowercase_normalizer: {
            type: 'custom',
            char_filter: [],
            filter: %w[lowercase]
          }
        },
        analyzer: {
          trigram_analyzer: {
            tokenizer: 'trigram'
          }
        },
        tokenizer: {
          trigram: {
            type: 'ngram',
            min_gram: 3,
            max_gram: 3,
            token_chars: %w[letter digit]
          }
        }
      }
    } do
      mapping dynamic: false do
        indexes :term,
                type: :keyword,
                normalizer: 'lowercase_normalizer',
                fields: {
                  simple: {
                    type: 'text',
                    analyzer: 'simple'
                  },
                  trigram: {
                    type: 'text',
                    analyzer: 'trigram_analyzer'
                  }
                }
      end
    end
  end
end
