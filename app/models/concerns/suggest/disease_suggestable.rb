class Suggest
  module DiseaseSuggestable
    extend ActiveSupport::Concern

    included do
      include Elasticsearch::Model
      # include Elasticsearch::Model::Callbacks

      index_name "suggest_#{Rails.env}"

      document_type 'disease'

      settings index: { number_of_shards: 1, number_of_replicas: 0 } do
        mappings dynamic: false, _all: { enabled: false } do
          indexes :label,
                  type:            'text',
                  fields:          {
                    raw: {
                      type: 'keyword'
                    }
                  },
                  analyzer:        'index_ngram_analyzer',
                  search_analyzer: 'search_ngram_analyzer'
        end
      end
    end

    module ClassMethods
      def elasticsearch
        __elasticsearch__
      end

      def client
        elasticsearch.client
      end
    end
  end
end