module Form
  class Sift < ParameterBase
    register(:without_score, 'Without score', 'N', '1')
    register(:deleterious, 'Deleterious', 'D', '1')
    register(:tolerated, 'Tolerated', 'T', '1')
  end
end
