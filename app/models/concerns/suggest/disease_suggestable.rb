class Suggest
  module DiseaseSuggestable
    extend ActiveSupport::Concern

    included do
      include Elasticsearch::Model
      # include Elasticsearch::Model::Callbacks

      index_name "suggest_#{Rails.env}"

      document_type 'disease'

      mappings dynamic: false do
        indexes :label,
                type:            'text',
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

      def import
        errors = []
        # FIXME: clinvar_info
        Lookup.distinct('clinvar_info.conditions').each_slice(1000) do |group|
          request  = { index:   index_name,
                       type:    document_type,
                       body:    group.map { |symbol| { index: { data: { label: symbol } } } },
                       refresh: true }
          response = client.bulk(request)
          errors   += response['items'].select { |k, _| k.values.first['error'] }
        end

        errors
      end
    end
  end
end