# frozen_string_literal: true

module TogoVar
  module API
    module Models
      module Concerns
        module ElasticsearchQueryHelper
          # @param [Hash, #to_hash] query
          # @return [Elasticsearch::DSL::Search::Search]
          def negate(query)
            hash = query.respond_to?(:to_hash) ? query.to_hash : query

            Elasticsearch::DSL::Search.search do
              query do
                bool do
                  must_not hash.fetch(:query, {})
                end
              end
            end
          end
        end
      end
    end
  end
end
