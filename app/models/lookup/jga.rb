class Lookup
  class JGA
    class NGS
      include ActiveModel::Validations

      class << self
        # num_alt_alleles
        # num_alleles
        # frequency
        # quality_score
        # passed
        ATTRIBUTES = %i[num_alt_alleles num_alleles frequency quality_score passed].freeze

        def attributes
          ATTRIBUTES
        end
      end

      attributes.each do |name|
        attr_accessor name
      end

      validates :num_alt_alleles, numericality: { only_integer: true,
                                                  greater_than_or_equal_to: 0 }
      validates :num_alleles, numericality: { only_integer: true,
                                              greater_than_or_equal_to: 0 }
      validates :frequency, numericality: { greater_than_or_equal_to: 0 }
      validates :quality_score, allow_nil: true, numericality: { greater_than_or_equal_to: 0 }
      validates :passed, inclusion: { in: [true, false] }

      def initialize(**attributes)
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

        graph << [subject, TgvLookup[:num_alt_alleles], num_alt_alleles]
        graph << [subject, TgvLookup[:num_alleles], num_alleles]
        graph << [subject, TgvLookup[:frequency], frequency]
        graph << [subject, TgvLookup[:quality_score], quality_score]
        graph << [subject, TgvLookup[:passed], passed]

        graph
      end
    end

    class SNP
      include ActiveModel::Validations

      class << self
        # num_alt_alleles
        # num_alleles
        # frequency
        # genotype_ref_hom
        # genotype_alt_hom
        # genotype_het
        ATTRIBUTES = %i[num_alt_alleles num_alleles frequency genotype_ref_hom genotype_alt_hom genotype_het].freeze

        def attributes
          ATTRIBUTES
        end
      end

      attributes.each do |name|
        attr_accessor name
      end

      validates :num_alt_alleles, numericality: { only_integer: true,
                                                  greater_than_or_equal_to: 0 }
      validates :num_alleles, numericality: { only_integer: true,
                                              greater_than_or_equal_to: 0 }
      validates :frequency, numericality: { greater_than_or_equal_to: 0 }
      validates :genotype_ref_hom, numericality: { only_integer: true,
                                              greater_than_or_equal_to: 0 }
      validates :genotype_alt_hom, numericality: { only_integer: true,
                                              greater_than_or_equal_to: 0 }
      validates :genotype_het, numericality: { only_integer: true,
                                              greater_than_or_equal_to: 0 }

      def initialize(**attributes)
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

        graph << [subject, TgvLookup[:num_alt_alleles], num_alt_alleles]
        graph << [subject, TgvLookup[:num_alleles], num_alleles]
        graph << [subject, TgvLookup[:frequency], frequency]
        graph << [subject, TgvLookup[:genotype_ref_hom], genotype_ref_hom]
        graph << [subject, TgvLookup[:genotype_alt_hom], genotype_alt_hom]
        graph << [subject, TgvLookup[:genotype_het], genotype_het]

        graph
      end
    end
  end
end
