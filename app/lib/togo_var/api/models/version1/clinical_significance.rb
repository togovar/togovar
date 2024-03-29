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

          def to_hash
            validate

            terms = @terms.filter_map { |x| (::ClinicalSignificance.find_by_id(x) || ::ClinicalSignificance.find_by_key(x))&.label&.downcase }

            q = Elasticsearch::DSL::Search.search do
              query do
                nested do
                  path 'clinvar.conditions'
                  query do
                    terms 'clinvar.conditions.interpretation': terms
                  end
                end
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
