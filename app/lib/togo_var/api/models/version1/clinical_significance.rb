# frozen_string_literal: true

module TogoVar
  module API
    module Models
      module Version1
        class ClinicalSignificance < StrictTerms
          self.key_name = :significance

          ACCEPTABLE_TERMS = %w[
            NC P LP US LB B CI DR A RF PR AF O NP AN
            not_in_clinvar pathogenic likely_pathogenic uncertain_significance likely_benign benign
            conflicting_interpretations_of_pathogenicity drug_response association risk_factor protective affects other
            not_provided association_not_found
          ].freeze

          def initialize(*args)
            super

            arg = @args.first

            @source = Array(arg[:source])
          end

          def to_hash
            validate

            terms = @terms.filter_map { |x| (::ClinicalSignificance.find_by_id(x) || ::ClinicalSignificance.find_by_key(x))&.label&.downcase }
            sources = @source # TODO: filter

            q = Elasticsearch::DSL::Search.search do
              query do
                bool do
                  if sources.present?
                    must do
                      terms 'conditions.source': sources
                    end
                  end

                  must do
                    nested do
                      path 'conditions.condition'
                      query do
                        terms 'conditions.condition.classification': terms
                      end
                    end
                  end
                end
              end
            end.to_hash[:query]

            q = if q[:bool][:must].size == 1
                  q[:bool][:must].first
                else
                  q
                end

            query = Elasticsearch::DSL::Search.search do
              query do
                nested do
                  path 'conditions'
                  query q
                end
              end
            end.to_hash[:query]

            @relation == 'ne' ? negate(query) : query
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
