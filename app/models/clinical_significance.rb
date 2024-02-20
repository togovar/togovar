# frozen_string_literal: true

class ClinicalSignificance
  Significance = Struct.new(:id, :key, :label, :index, keyword_init: true)

  module Significances
    NOT_IN_CLINVAR = Significance.new(id: :not_in_clinvar, key: :NC, label: 'Not in ClinVar', index: 0)
    PATHOGENIC = Significance.new(id: :pathogenic, key: :P, label: 'Pathogenic', index: 1)
    PATHOGENIC_LOW_PENETRANCE = Significance.new(id: :pathogenic_low_penetrance, key: :PLP, label: 'Pathogenic, low penetrance', index: 2)
    LIKELY_PATHOGENIC = Significance.new(id: :likely_pathogenic, key: :LP, label: 'Likely pathogenic', index: 3)
    LIKELY_PATHOGENIC_LOW_PENETRANCE = Significance.new(id: :likely_pathogenic_low_penetrance, key: :LPLP, label: 'Likely pathogenic, low penetrance', index: 4)
    DRUG_RESPONSE = Significance.new(id: :drug_response, key: :DR, label: 'Drug response', index: 5)
    ESTABLISHED_RISK_ALLELE = Significance.new(id: :established_risk_allele, key: :ERA, label: 'Established risk allele', index: 6)
    LIKELY_RISK_ALLELE = Significance.new(id: :likely_risk_allele, key: :LRA, label: 'Likely risk allele', index: 7)
    UNCERTAIN_RISK_ALLELE = Significance.new(id: :uncertain_risk_allele, key: :URA, label: 'Uncertain risk allele', index: 8)
    CONFERS_SENSITIVITY = Significance.new(id: :confers_sensitivity, key: :CS, label: 'Confers sensitivity', index: 9)
    ASSOCIATION = Significance.new(id: :association, key: :A, label: 'Association', index: 10)
    RISK_FACTOR = Significance.new(id: :risk_factor, key: :RF, label: 'Risk factor', index: 11)
    AFFECTS = Significance.new(id: :affects, key: :AF, label: 'Affects', index: 12)
    PROTECTIVE = Significance.new(id: :protective, key: :PR, label: 'Protective', index: 13)
    BENIGN = Significance.new(id: :benign, key: :B, label: 'Benign', index: 14)
    LIKELY_BENIGN = Significance.new(id: :likely_benign, key: :LB, label: 'Likely benign', index: 15)
    CONFLICT = Significance.new(id: :conflicting_interpretations_of_pathogenicity, key: :CI, label: 'Conflicting interpretations of pathogenicity', index: 16)
    ASSOCIATION_NOT_FOUND = Significance.new(id: :association_not_found, key: :AN, label: 'Association not found', index: 17)
    OTHER = Significance.new(id: :other, key: :O, label: 'Other', index: 18)
    UNCERTAIN_SIGNIFICANCE = Significance.new(id: :uncertain_significance, key: :US, label: 'Uncertain significance', index: 19)
    NOT_PROVIDED = Significance.new(id: :not_provided, key: :NP, label: 'Not provided', index: 20)
  end

  class << self
    # @return [Array<Significance>]
    def all
      @all ||= Significances.constants.map { |x| Significances.const_get(x) }.sort_by(&:index)
    end

    # @return [Significance]
    def find_by_id(value)
      value = value.is_a?(String) ? value.to_sym : value

      all.find { |x| x.id == value }
    end

    # @return [Significance]
    def find_by_key(value)
      value = value.is_a?(String) ? value.to_sym : value

      all.find { |x| x.key == value }
    end
  end
end
