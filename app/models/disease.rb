class Disease
  include Searchable::Disease

  class << self
    # @param [String] query
    # @return [Elasticsearch::Model::Response] response
    def suggest(query)
      body = ::Elasticsearch::DSL::Search.search do
        query do
          bool do
            should do
              match 'term.search': { query: query, boost: 2 }
            end
            should do
              match 'term.suggest': query
            end
          end
        end
      end

      search(body)
    end

    # @param [String] query
    # @return [Elasticsearch::Model::Response] response
    def exact_match(query)
      body = ::Elasticsearch::DSL::Search.search do
        query do
          match 'term.lowercase': query.downcase
        end
      end

      results = search(body).results

      results.map { |x| x.dig(:_source, :term) }.first if results.total.positive?
    end
  end
end
