class Lookup
  class ToMMo
    include ActiveModel::Validations

    class << self
      # num_alt_alleles
      # num_alleles
      # frequency
      # passed
      ATTRIBUTES = %i[num_alt_alleles num_alleles frequency passed].freeze

      def attributes
        ATTRIBUTES
      end
    end

    attributes.each do |name|
      attr_accessor name
    end

    validates :num_alt_alleles, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
    validates :num_alleles, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
    validates :frequency, numericality: { greater_than_or_equal_to: 0 }
    validates :passed, inclusion: { in: [true, false] }

    def initialize(**attributes)
      @passed = false

      attributes.each do |k, v|
        send("#{k}=", v)
      end
      yield self if block_given?
    end

    def attributes
      self.class.attributes.map { |name| [name, send(name)] }.to_h
    end

    def to_rdf(subject = RDF::Node.new)
      validate!

      graph = RDF::Graph.new

      graph << [subject, Tgvl[:num_alt_alleles], num_alt_alleles]
      graph << [subject, Tgvl[:num_alleles], num_alleles]
      graph << [subject, Tgvl[:frequency], frequency]
      graph << [subject, Tgvl[:passed], passed]

      graph
    end
  end
end
