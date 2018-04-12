class Lookup
  class MolecularAnnotation
    include ActiveModel::Validations

    class << self
      # gene
      # symbol
      # symbol_source
      # hgvs_g
      # transcripts
      ATTRIBUTES = %i[gene symbol symbol_source hgvs_g transcripts].freeze

      def attributes
        ATTRIBUTES
      end
    end

    attributes.each do |name|
      attr_accessor name
    end

    validates :transcripts, allow_nil: true, array_of: { type: Transcript }

    def initialize(**attributes)
      @transcripts = []
      attributes.each do |k, v|
        send("#{k}=", v)
      end
      yield self if block_given?
    end

    def attributes
      self.class.attributes.map do |name|
        v = send(name)
        v = v.attributes if v.respond_to?(:attributes)
        if v.is_a?(Array)
          v = v.map do |v2|
            v2.respond_to?(:attributes) ? v2.attributes : v2
          end
        end
        [name, v]
      end.to_h
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
