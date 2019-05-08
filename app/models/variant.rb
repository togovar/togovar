class Variant
  module Elasticsearch
    include VariantSearchable
  end

  class << self
    # @param [Hash] query
    # @return [Elasticsearch::Model::Response] response
    def search(query)
      Elasticsearch.search(query)
    end

    # @return [Integer] number of total records
    def total
      @total ||= begin
        query = ::Elasticsearch::QueryBuilder.new
                  .limit(0)
                  .sort(false)
                  .build

        Elasticsearch.search(query).results.total
      end
    end
  end
end
