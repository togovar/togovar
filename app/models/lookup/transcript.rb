class Lookup
  class Transcript
    include ActiveModel::Validations

    CONSEQUENCES_ORDER = %w[SO_0001893 SO_0001574 SO_0001575 SO_0001587
                            SO_0001589 SO_0001578 SO_0002012 SO_0001889
                            SO_0001821 SO_0001822 SO_0001583 SO_0001818
                            SO_0001630 SO_0001626 SO_0001567 SO_0001819
                            SO_0001580 SO_0001620 SO_0001623 SO_0001624
                            SO_0001792 SO_0001627 SO_0001621 SO_0001619
                            SO_0001631 SO_0001632 SO_0001895 SO_0001892
                            SO_0001782 SO_0001894 SO_0001891 SO_0001907
                            SO_0001566 SO_0001906 SO_0001628].freeze

    class << self
      # gene
      # symbol
      # symbol_source
      # hgvs_c
      # consequences
      # sift
      # polyphen
      # most_severe
      ATTRIBUTES = %i[gene symbol symbol_source hgvs_c consequences sift polyphen most_severe].freeze

      def attributes
        ATTRIBUTES
      end
    end

    attributes.each do |name|
      attr_accessor name
    end

    validates :consequences, allow_nil: true, array_of: { type: String }
    validates :sift, allow_nil: true, numericality: { greater_than_or_equal_to: 0 }
    validates :polyphen, allow_nil: true, numericality: { greater_than_or_equal_to: 0 }
    validates :most_severe, inclusion: { in: [true, false] }

    def initialize(**attributes)
      @consequences = []
      @most_severe  = false
      attributes.each do |k, v|
        send("#{k}=", v)
      end
      yield self if block_given?
    end

    def attributes
      self.class.attributes.map { |name| [name, send(name)] }.to_h
    end

    # @return [Array<RDF::Statement>]
    def to_rdf(subject = RDF::Node.new)
      validate!

      graph = RDF::Graph.new

      graph << [subject, RDF.type, RDF::URI('http://togovar.org/ontology/Transcript')]
      graph << [subject, Tgvl[:gene], gene] if gene
      graph << [subject, Tgvl[:symbol], symbol] if symbol
      graph << [subject, Tgvl[:symbol_source], symbol_source] if symbol_source
      graph << [subject, Tgvl[:hgvs_c], hgvs_c] if hgvs_c
      consequences&.each do |x|
        graph << [subject, Tgvl[:consequence], Obo[x]]
      end
      graph << [subject, Tgvl[:sift], sift] if sift
      graph << [subject, Tgvl[:polyphen], polyphen] if polyphen
      graph << [subject, Tgvl[:most_severe], most_severe] if most_severe

      graph
    end
  end
end
