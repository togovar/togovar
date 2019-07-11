require 'weakref'

class GeneSymbol
  module Elasticsearch
    include GeneSymbolSearchable
  end

  class << self
    # @param [String] prefix
    # @return [Elasticsearch::Model::Response] response
    def suggest(prefix)
      query = ::Elasticsearch::DSL::Search.search do
        query do
          match 'symbol': { query: prefix, analyzer: 'standard' }
        end
      end

      Elasticsearch.search(query)
    end

    # @param [String] term
    # @return [Elasticsearch::Model::Response] response
    def search(term)
      query = ::Elasticsearch::DSL::Search.search do
        query do
          match 'symbol.raw': term
        end
      end

      Elasticsearch.search(query)
    end

    # @param [String] term
    # @return [Array<String>]
    def synonyms_for(term)
      @synonym_cache ||= {}

      return @synonym_cache[term] if @synonym_cache[term]

      query = ::Elasticsearch::DSL::Search.search do
        query do
          match 'alias_of': term
        end
      end

      synonyms = Elasticsearch.search(query).results.map { |x| x.dig(:_source, :symbol) }.compact

      ref = WeakRef.new(synonyms)
      ObjectSpace.define_finalizer(synonyms, proc { @synonym_cache.delete(synonyms) if @synonym_cache[synonyms] == ref })
      @synonym_cache[term] = ref

      synonyms
    end
  end
end
