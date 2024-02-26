module Form
  class Dataset < ParameterBase
    Variation::Datasets::ALL.each do |x|
      register(x.to_sym, x, x, '1')
    end
  end
end
