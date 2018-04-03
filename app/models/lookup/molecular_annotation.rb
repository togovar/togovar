class Lookup
  class MolecularAnnotation
    include ActiveModel::Validations

    attr_accessor :gene
    attr_accessor :symbol
    attr_accessor :symbol_source
    attr_accessor :hgvs_g
    attr_accessor :transcripts

    validates :transcripts, allow_nil: true, array_of: { type: Transcript }

    def initialize(**attributes)
      @transcripts = []
      attributes.each do |k, v|
        send("#{k}=", v)
      end
      yield self if block_given?
    end

    # @return [Array<RDF::Statement>]
    def to_rdf(subject = RDF::Node.new)
      validate!

      graph = RDF::Graph.new

      graph << [subject, TgvLookup[:gene], gene] if gene
      graph << [subject, TgvLookup[:symbol], symbol] if symbol
      graph << [subject, TgvLookup[:symbol_source], symbol_source] if symbol_source
      graph << [subject, TgvLookup[:hgvs_g], hgvs_g] if hgvs_g

      transcripts&.each do |t|
        bn = RDF::Node.new
        gr = t.to_rdf(bn)

        graph << [subject, TgvLookup[:transcript], bn]
        graph.insert(*gr.statements)
      end

      graph
    end
  end
end
