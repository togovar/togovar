class Suggest
  module Suggestable
    extend ActiveSupport::Concern

    included do
      include Elasticsearch::Model
      # include Elasticsearch::Model::Callbacks

      index_name "suggest_#{Rails.env}"

      settings index:    { number_of_shards: 1, number_of_replicas: 0 },
               analysis: {
                 filter:   {
                   ngram_filter: {
                     type:     'nGram',
                     min_gram: 3,
                     max_gram: 15
                   }
                 },
                 analyzer: {
                   index_ngram_analyzer:  {
                     tokenizer: 'standard',
                     filter:    %w[standard lowercase stop ngram_filter],
                     type:      'custom'
                   },
                   search_ngram_analyzer: {
                     tokenizer: 'standard',
                     filter:    %w[standard lowercase stop],
                     type:      'custom'
                   }
                 }
               }
    end

    module ClassMethods
      def elasticsearch
        __elasticsearch__
      end

      def client
        elasticsearch.client
      end

      def create_index
        mappings = GeneSuggest.mappings.as_json.merge(DiseaseSuggest.mappings)
        client.indices.create index: index_name,
                              body:  { settings: settings,
                                       mappings: mappings }
      end
    end
  end
end