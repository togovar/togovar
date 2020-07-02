class Gene
  module Searchable
    extend ActiveSupport::Concern
    include ElasticsearchIndex::Base

    included do
      include Elasticsearch::Model

      index_name :gene

      settings = {
        index: {
          number_of_shards: ENV.fetch('TOGOVAR_INDEX_GENE_NUMBER_OF_SHARDS') { 1 },
          number_of_replicas: ENV.fetch('TOGOVAR_INDEX_GENE_NUMBER_OF_REPLICAS') { 0 }
        },
        analysis: {
          analyzer: {
            symbol_search_analyzer: {
              type: :custom,
              tokenizer: :whitespace,
              filter: :lowercase
            },
            symbol_suggest_analyzer: {
              type: :custom,
              tokenizer: :whitespace,
              filter: %i[lowercase edge_ngram_filter]
            }
          },
          filter: {
            edge_ngram_filter: {
              type: :edge_ngram,
              min_gram: 3,
              max_gram: 20
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
          indexes :id, type: :integer
          indexes :symbol,
                  type: :keyword,
                  fields: {
                    search: {
                      type: :text,
                      analyzer: :symbol_search_analyzer
                    },
                    suggest: {
                      type: :text,
                      analyzer: :symbol_suggest_analyzer
                    },
                    lowercase: {
                      type: :keyword,
                      normalizer: :lowercase
                    }
                  }
          indexes :name, type: :keyword
          indexes :location, type: :keyword
          indexes :alias, type: :nested do
            indexes :symbol,
                    type: :keyword,
                    fields: {
                      search: {
                        type: :text,
                        analyzer: :symbol_search_analyzer
                      },
                      suggest: {
                        type: :text,
                        analyzer: :symbol_suggest_analyzer
                      },
                      lowercase: {
                        type: :keyword,
                        normalizer: :lowercase
                      }
                    }
            indexes :name, type: :keyword
          end
          indexes :family, type: :nested do
            indexes :id, type: :integer
            indexes :name, type: :keyword
          end
        end
      end
    end

    module ClassMethods
      # @return [Hash]
      def synonyms(id)
        return unless id

        query = Elasticsearch::DSL::Search.search do
          query do
            match id: id
          end
        end

        result = __elasticsearch__.search(query).results.first.to_h

        result.dig('_source', 'alias')&.map { |x| x['symbol'] }
      end

      # @param [String] query
      # @return [Elasticsearch::Model::Response] response
      def suggest(term)
        query = ::Elasticsearch::DSL::Search.search do
          query do
            bool do
              should do
                match 'symbol.lowercase': { query: term.downcase, boost: 3 }
              end
              should do
                match 'symbol.search': { query: term, boost: 2 }
              end
              should do
                match 'symbol.suggest': { query: term }
              end
              should do
                nested do
                  path :alias
                  query do
                    match 'alias.symbol.lowercase': { query: term.downcase, boost: 3 }
                  end
                end
              end
              should do
                nested do
                  path :alias
                  query do
                    match 'alias.symbol.search': { query: term, boost: 2 }
                  end
                end
              end
              should do
                nested do
                  path :alias
                  query do
                    match 'alias.symbol.suggest': { query: term }
                  end
                end
              end
            end
          end
        end

        __elasticsearch__.search(query)
      end

      # @param [String] term
      # @return [Elasticsearch::Model::Response] response
      def exact_match(term)
        query = ::Elasticsearch::DSL::Search.search do
          query do
            bool do
              should do
                match 'symbol.lowercase': term.downcase
              end
              should do
                nested do
                  path :alias
                  query do
                    match 'alias.symbol.lowercase': term.downcase
                  end
                end
              end
            end
          end
        end

        results = __elasticsearch__.search(query).results

        results.map { |x| x.dig(:_source, :symbol) }.first if results.total.positive?
      end
    end
  end
end
