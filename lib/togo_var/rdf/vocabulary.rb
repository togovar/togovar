require 'rdf'

module TogoVar
  module Vocabulary
    FALDO = RDF::Vocabulary.new('http://biohackathon.org/resource/faldo#')
    HCO = RDF::Vocabulary.new('http://identifiers.org/hco/')
    M2R = RDF::Vocabulary.new('http://med2rdf.org/ontology/med2rdf#')
    OBO = RDF::Vocabulary.new('http://purl.obolibrary.org/obo/')
    TGVO = RDF::Vocabulary.new('http://togovar.biosciencedbc.jp/ontology/')
  end
end
