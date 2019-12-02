class Variant
  include Searchable::Variant

  class << self
    # @param [Hash] query
    # @return [Elasticsearch::Model::Response] response
    # def search(query, options = {})
    #   Elasticsearch.search(query, options)
    # end

    # @return [Integer] number of total records
    def total
      @total ||= begin
        query = ::Elasticsearch::QueryBuilder.new
                  .limit(0)
                  .sort(false)
                  .build

        search(query).results.total
      end
    end
  end
end
