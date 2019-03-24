module Form
  class Sift < ParameterBase
    register(:deleterious, 'Deleterious', 'D', '1')
    register(:tolerated, 'Tolerated', 'T', '1')
  end
end
