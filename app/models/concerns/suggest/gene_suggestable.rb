class Suggest
  module GeneSuggestable
    extend ActiveSupport::Concern

    included do
      include Elasticsearch::Model
      # include Elasticsearch::Model::Callbacks

      index_name "suggest_#{Rails.env}"

      document_type 'gene'

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