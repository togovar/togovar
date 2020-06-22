module TogoVar
  module RDF
    module Formatter
      module ClinVar
        include Vocabulary

        SUBJECT_FORMAT = VARIATION_SUBJECT_FORMAT

        def to_rdf
          statements = RDF::Statements.new

          s = ::RDF::URI.new(SUBJECT_FORMAT % [chrom, pos, ref, alt.first])

          statements << [s, TGV.condition, (bn = ::RDF::Node.new)]
          statements << [bn, ::RDF.type, TGV.Annotation]
          statements << [bn, ::RDF::Vocab::DC.source, 'ClinVar']
          statements << [bn, ::RDF::Vocab::RDFS.seeAlso, ::RDF::URI('http://ncbi.nlm.nih.gov/clinvar/variation/%d' % Integer(id))]

          statements
        end
      end
    end
  end
end
