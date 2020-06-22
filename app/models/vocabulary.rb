module Vocabulary
  FALDO = ::RDF::Vocabulary.new('http://biohackathon.org/resource/faldo#')
  HCO = ::RDF::Vocabulary.new('http://identifiers.org/hco/')
  M2R = ::RDF::Vocabulary.new('http://med2rdf.org/ontology/med2rdf#')
  OBO = ::RDF::Vocabulary.new('http://purl.obolibrary.org/obo/')
  SIO = ::RDF::Vocabulary.new('http://semanticscience.org/resource/')

  TGV = Class.new(RDF::StrictVocabulary('http://togovar.biosciencedbc.jp/vocabulary/')) do
    ontology :'http://togovar.biosciencedbc.jp/vocabulary/',
             'dc11:title': 'A vocabulary used by TogoVar'.freeze,
             type: 'owl:Ontology'.freeze

    term :Annotation,
         label: 'Annotation'.freeze,
         type: 'rdfs:Class'.freeze

    term :Statistics,
         label: 'Statistics'.freeze,
         type: 'rdfs:Class'.freeze

    property :hasConsequence,
             label: 'hasConsequence'.freeze,
             type: 'rdf:Property'.freeze

    property :transcript,
             label: 'transcript'.freeze,
             type: 'rdf:Property'.freeze

    property :gene,
             label: 'gene'.freeze,
             type: 'rdf:Property'.freeze

    property :sift,
             label: 'sift'.freeze,
             type: 'rdf:Property'.freeze

    property :polyphen,
             label: 'polyphen'.freeze,
             type: 'rdf:Property'.freeze

    property :condition,
             label: 'condition'.freeze,
             type: 'rdf:Property'.freeze

    property :statistics,
             label: 'statistics'.freeze,
             type: 'rdf:Property'.freeze

    property :alleleCount,
             label: 'alleleCount'.freeze,
             type: 'rdf:Property'.freeze

    property :alleleNumber,
             label: 'alleleNumber'.freeze,
             type: 'rdf:Property'.freeze

    property :alleleFrequency,
             label: 'alleleFrequency'.freeze,
             type: 'rdf:Property'.freeze

    property :heterozygousAlleleCount,
             label: 'heterozygousAlleleCount'.freeze,
             type: 'rdf:Property'.freeze

    property :homozygousAlternativeAlleleCount,
             label: 'homozygousAlternativeAlleleCount'.freeze,
             type: 'rdf:Property'.freeze

    property :homozygousReferenceAlleleCount,
             label: 'homozygousReferenceAlleleCount'.freeze,
             type: 'rdf:Property'.freeze

    property :quality,
             label: 'quality'.freeze,
             type: 'rdf:Property'.freeze

    property :filter,
             label: 'filter'.freeze,
             type: 'rdf:Property'.freeze

  end
end
