module Form
  class Type < ParameterBase
    register(:snv, 'SNV', SequenceOntology.find_by_label('SNV').id, '1')
    register(:insertion, 'Insertion', SequenceOntology.find_by_label('insertion').id, '1')
    register(:deletion, 'Deletion', SequenceOntology.find_by_label('deletion').id, '1')
    register(:indel, 'Indel', SequenceOntology.find_by_label('indel').id, '1')
    register(:substitution, 'Substitution', SequenceOntology.find_by_label('substitution').id, '1')
  end
end
