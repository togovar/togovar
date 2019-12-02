require 'weakref'

class GeneSymbol
  module Elasticsearch
    include GeneSymbolSearchable
  end

  class << self
    # @param [String] query
    # @return [Elasticsearch::Model::Response] response
    def suggest(query)
      body = ::Elasticsearch::DSL::Search.search do
        query do
          bool do
            should do
              match 'symbol.lowercase': { query: query.downcase, boost: 3 }
            end
            should do
              match 'symbol.search': { query: query, boost: 2 }
            end
            should do
              match 'symbol.suggest': { query: query }
            end
          end
        end
      end

      Elasticsearch.search(body)
    end

    # @param [String] query
    # @return [Elasticsearch::Model::Response] response
    def exact_match(query)
      body = ::Elasticsearch::DSL::Search.search do
        query do
          match 'symbol.lowercase': query.downcase
        end
      end

      results = Elasticsearch.search(body).results

      results.map { |x| x.dig(:_source, :symbol) }.first if results.total.positive?
    end

    # @param [String] query
    # @return [Elasticsearch::Model::Response] response
    def search(query)
      body = ::Elasticsearch::DSL::Search.search do
        query do
          bool do
            must do
              match 'symbol.lowercase': { query: query.downcase }
            end
            must do
              bool do
                must_not do
                  exists field: :alias_of
                end
              end
            end
          end
        end
      end

      Elasticsearch.search(body)
    end

    # @param [String] query
    # @return [Array<String>]
    def synonyms_for(query)
      @synonym_cache ||= {}

      return @synonym_cache[query] if @synonym_cache[query]

      body = ::Elasticsearch::DSL::Search.search do
        query do
          match alias_of: { query: query }
        end
      end

      synonyms = Elasticsearch.search(body).results.map { |x| x.dig(:_source, :symbol) }.compact

      ref = WeakRef.new(synonyms)
      ObjectSpace.define_finalizer(synonyms, proc { @synonym_cache.delete(synonyms) if @synonym_cache[synonyms] == ref })
      @synonym_cache[query] = ref

      synonyms
    end
  end
end
