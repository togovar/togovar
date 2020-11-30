# frozen_string_literal: true

class ClinicalSignificance < TermDictionary
  module Terms
    NOT_IN_CLINVAR = TermDictionary::Term.new('not_in_clinvar', :NC, 'Not in ClinVar')
    PATHOGENIC = TermDictionary::Term.new('pathogenic', :P, 'Pathogenic')
    LIKELY_PATHOGENIC = TermDictionary::Term.new('likely_pathogenic', :LP, 'Likely pathogenic')
    UNCERTAIN_SIGNIFICANCE = TermDictionary::Term.new('uncertain_significance', :US, 'Uncertain significance')
    LIKELY_BENIGN = TermDictionary::Term.new('likely_benign', :LB, 'Likely benign')
    BENIGN = TermDictionary::Term.new('benign', :B, 'Benign')
    CONFLICT = TermDictionary::Term.new('conflicting_interpretations_of_pathogenicity', :CI,
                                        'Conflicting interpretations of pathogenicity')
    DRUG_RESPONSE = TermDictionary::Term.new('drug_response', :DR, 'Drug response')
    ASSOCIATION = TermDictionary::Term.new('association', :A, 'Association')
    RISK_FACTOR = TermDictionary::Term.new('risk_factor', :RF, 'Risk factor')
    PROTECTIVE = TermDictionary::Term.new('protective', :PR, 'Protective')
    AFFECTS = TermDictionary::Term.new('affects', :AF, 'Affects')
    OTHER = TermDictionary::Term.new('other', :O, 'Other')
    NOT_PROVIDED = TermDictionary::Term.new('not_provided', :NP, 'Not provided')
    ASSOCIATION_NOT_FOUND = TermDictionary::Term.new('association_not_found', :AN, 'Association not found')
  end
  include Terms
end
