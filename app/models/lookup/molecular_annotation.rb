class Lookup
  class MolecularAnnotation
    include ActiveModel::Validations

    attr_accessor :gene
    attr_accessor :symbol
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
      graph << [subject, TgvLookup.gene, gene] if gene
      graph << [subject, TgvLookup.symbol, symbol] if symbol

      transcripts.each do |ts|
        bn = RDF::Node.new
        graph << [subject, TgvLookup.transcript, bn]
        graph.insert(*ts.to_rdf(bn))
      end

      graph
    end
  end
end
