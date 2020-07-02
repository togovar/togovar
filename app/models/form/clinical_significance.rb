module Form
  class ClinicalSignificance < ParameterBase
    register(:not_in_clinvar, 'Not in ClinVar', 'NC', '1')
    register(:pathogenic, 'Pathogenic', 'P', '1')
    register(:likely_pathogenic, 'Likely pathogenic', 'LP', '1')
    register(:uncertain_significance, 'Uncertain significance', 'US', '1')
    register(:likely_benign, 'Likely benign', 'LB', '1')
    register(:benign, 'Benign', 'B', '1')
    register(:conflicting_interpretations_of_pathogenicity, 'Conflicting interpretations of pathogenicity', 'CI', '1')
    register(:drug_response, 'Drug response', 'DR', '1')
    register(:association, 'Association', 'A', '1')
    register(:risk_factor, 'Risk factor', 'RF', '1')
    register(:protective, 'Protective', 'PR', '1')
    register(:affects, 'Affects', 'AF', '1')
    register(:other, 'Other', 'O', '1')
    register(:not_provided, 'Not provided', 'NP', '1')
    register(:association_not_found, 'Association not found', 'AN', '1')
  end
end
