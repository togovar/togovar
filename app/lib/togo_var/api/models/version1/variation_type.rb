# frozen_string_literal: true

module TogoVar
  module API
    module Models
      module Version1
        class VariationType < StrictTerms
          self.key_name = :type

          ACCEPTABLE_TERMS = %w[
            SO_0001483 SO_0000667 SO_0000159 SO_1000032 SO_1000002
            snv ins del indel sub
          ].freeze

          def to_hash
            validate

            terms = @terms
                      .map { |x| (SequenceOntology.find(x) || SequenceOntology.find_by_key(x))&.label }
                      .compact

            q = Elasticsearch::DSL::Search.search do
              query do
                terms type: terms
              end
            end

            (@relation == 'ne' ? negate(q) : q).to_hash[:query]
          end

          protected

          def acceptable_terms
            ACCEPTABLE_TERMS
          end
        end
      end
    end
  end
end
