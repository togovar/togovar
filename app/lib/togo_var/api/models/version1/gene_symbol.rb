# frozen_string_literal: true

module TogoVar
  module API
    module Models
      module Version1
        class GeneSymbol < NonStrictTerms
          def to_hash
            validate

            terms = @terms

            q = Elasticsearch::DSL::Search.search do
              query do
                nested do
                  path 'vep.symbol'
                  query do
                    bool do
                      must { match 'vep.symbol.source': 'HGNC' }
                      must { terms 'vep.symbol.label': terms }
                    end
                  end
                end
              end
            end

            (@relation == 'ne' ? negate(q) : q).to_hash[:query]
          end
        end
      end
    end
  end
end
