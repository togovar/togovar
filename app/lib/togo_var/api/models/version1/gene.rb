# frozen_string_literal: true

module TogoVar
  module API
    module Models
      module Version1
        class Gene < NonStrictTerms
          def to_hash
            validate

            terms = @terms

            q = Elasticsearch::DSL::Search.search do
              query do
                nested do
                  path 'vep'
                  query do
                    terms 'vep.hgnc_id': terms
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
