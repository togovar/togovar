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

      # @return [Array<RDF::Statement>]
      def to_rdf(subject = RDF::Node.new)
        validate!

        graph = RDF::Graph.new

        graph << [subject, Tgvl[:num_alt_alleles], num_alt_alleles]
        graph << [subject, Tgvl[:num_alleles], num_alleles]
        graph << [subject, Tgvl[:frequency], frequency]
        graph << [subject, Tgvl[:quality_score], quality_score]
        graph << [subject, Tgvl[:passed], passed]

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
        ATTRIBUTES = %i[num_alleles num_ref_alleles num_alt_alleles num_genotype_ref_homo num_genotype_hetero num_genotype_alt_homo frequency].freeze

        def attributes
          ATTRIBUTES
        end
      end

      attributes.each do |name|
        attr_accessor name
      end

      validates :num_alleles, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
      validates :num_ref_alleles, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
      validates :num_alt_alleles, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
      validates :num_genotype_ref_homo, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
      validates :num_genotype_hetero, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
      validates :num_genotype_alt_homo, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
      validates :frequency, numericality: { greater_than_or_equal_to: 0 }

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

        graph << [subject, Tgvl[:num_alleles], num_alleles]
        graph << [subject, Tgvl[:num_ref_alleles], num_ref_alleles]
        graph << [subject, Tgvl[:num_alt_alleles], num_alt_alleles]
        graph << [subject, Tgvl[:num_genotype_ref_homo], num_genotype_ref_homo]
        graph << [subject, Tgvl[:num_genotype_hetero], num_genotype_hetero]
        graph << [subject, Tgvl[:num_genotype_alt_homo], num_genotype_alt_homo]
        graph << [subject, Tgvl[:frequency], frequency]

        graph
      end
    end
  end
end
