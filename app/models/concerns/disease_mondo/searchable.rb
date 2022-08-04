class DiseaseMondo
  module Searchable
    extend ActiveSupport::Concern
    include ElasticsearchIndex::Base

    included do
      include Elasticsearch::Model

      index_name :disease_mondo

      settings = {
        index: {
          number_of_shards: ENV.fetch('TOGOVAR_INDEX_DISEASE_MONDO_NUMBER_OF_SHARDS') { 1 },
          number_of_replicas: ENV.fetch('TOGOVAR_INDEX_DISEASE_MONDO_NUMBER_OF_REPLICAS') { 0 },
        },
        analysis: {
          analyzer: {
            search_analyzer: {
              type: :custom,
              tokenizer: :standard,
              filter: %i[lowercase]
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
        mapping dynamic: :strict do
          indexes :mondo, type: :keyword
          indexes :parent, type: :keyword
          indexes :cui, type: :keyword
          indexes :label, type: :keyword,
                  fields: {
                    search: {
                      type: :text,
                      analyzer: :search_analyzer
                    },
                  }
        end
      end
    end
  end
end
