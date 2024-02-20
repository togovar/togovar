module Form
  class Polyphen < ParameterBase
    register(:without_score, 'Without score', 'N', '1')
    register(:probabl_damaging, 'Probably Damaging', 'PROBD', '1')
    register(:possibly_damaging, 'Possibly Damaging', 'POSSD', '1')
    register(:benign, 'Benign', 'B', '1')
    register(:unknown, 'Unknown', 'U', '1')
  end
end
