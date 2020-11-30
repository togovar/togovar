# frozen_string_literal: true

module TogoVar
  module API
    module Models
      module Version1
        class Disease < NonStrictTerms
          ACCEPTABLE_RELATIONS = %w[eq ne contains not_contains].freeze

          def to_hash
            validate

            terms = @terms

            q = Elasticsearch::DSL::Search.search do
              query do
                terms case @relation
                      when 'eq'
                        { 'clinvar.condition.raw': terms }
                      when 'contain'
                        { 'clinvar.condition': terms }
                      else
                        raise
                      end
              end
            end

            (%w[ne not_contain].include?(@relation) ? negate(q) : q).to_hash[:query]
          end

          protected

          def acceptable_relations
            ACCEPTABLE_RELATIONS
          end
        end
      end
    end
  end
end
