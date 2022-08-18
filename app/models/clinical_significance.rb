# frozen_string_literal: true

class ClinicalSignificance
  Significance = Struct.new(:id, :key, :label, :index, keyword_init: true)

  module Significances
    NOT_IN_CLINVAR = Significance.new(id: :not_in_clinvar, key: :NC, label: 'Not in ClinVar', index: 0)
    PATHOGENIC = Significance.new(id: :pathogenic, key: :P, label: 'Pathogenic', index: 1)
    LIKELY_PATHOGENIC = Significance.new(id: :likely_pathogenic, key: :LP, label: 'Likely pathogenic', index: 2)
    UNCERTAIN_SIGNIFICANCE = Significance.new(id: :uncertain_significance, key: :US, label: 'Uncertain significance', index: 3)
    LIKELY_BENIGN = Significance.new(id: :likely_benign, key: :LB, label: 'Likely benign', index: 4)
    BENIGN = Significance.new(id: :benign, key: :B, label: 'Benign', index: 5)
    CONFLICT = Significance.new(id: :conflicting_interpretations_of_pathogenicity, key: :CI, label: 'Conflicting interpretations of pathogenicity', index: 6)
    DRUG_RESPONSE = Significance.new(id: :drug_response, key: :DR, label: 'Drug response', index: 7)
    ASSOCIATION = Significance.new(id: :association, key: :A, label: 'Association', index: 8)
    RISK_FACTOR = Significance.new(id: :risk_factor, key: :RF, label: 'Risk factor', index: 9)
    PROTECTIVE = Significance.new(id: :protective, key: :PR, label: 'Protective', index: 10)
    AFFECTS = Significance.new(id: :affects, key: :AF, label: 'Affects', index: 11)
    OTHER = Significance.new(id: :other, key: :O, label: 'Other', index: 12)
    NOT_PROVIDED = Significance.new(id: :not_provided, key: :NP, label: 'Not provided', index: 13)
    ASSOCIATION_NOT_FOUND = Significance.new(id: :association_not_found, key: :AN, label: 'Association not found', index: 14)
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
