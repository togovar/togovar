module Form
  class AlphaMissense < ParameterBase
    register(:without_score, 'Without score', 'N', '1')
    register(:likely_pathogenic, 'Likely pathogenic', 'LP', '1')
    register(:ambiguous, 'Ambiguous', 'A', '1')
    register(:likely_benign, 'Likely benign', 'LB', '1')
  end
end
