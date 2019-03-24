module Form
  class Frequency < ParameterBase
    register(:from, 'From', 'from', '0.0')
    register(:to, 'To', 'to', '1.0')
    register(:invert, 'Invert', 'invert', '0')
    register(:match, 'Match', 'match', 'any')
  end
end
