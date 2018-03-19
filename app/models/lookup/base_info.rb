class Lookup
  class BaseInfo
    include ActiveModel::Validations

    CHROMOSOME = (1..22).map(&:to_s).concat(%w[X Y]).freeze
    NUCLEOBASE = /\A[ATGCURYMKSWBHVDN]+\z/

    attr_accessor :chromosome
    attr_accessor :position
    attr_accessor :reference
    attr_accessor :alternative
    attr_accessor :variant_class
    attr_accessor :rs

    validates :chromosome, presence: true, inclusion: { in:      CHROMOSOME,
                                                        message: 'invalid chromosome' }
    validates :position, presence: true, numericality: { only_integer: true,
                                                         greater_than: 0 }
    validates :reference, allow_nil: true, format: { with:    NUCLEOBASE,
                                                     message: 'has invalid nucleobase' }
    validates :alternative, allow_nil: true, format: { with:    NUCLEOBASE,
                                                       message: 'has invalid nucleobase' }
    validates :variant_class, presence: true, format: { with:    /\ASO_\d+\z/,
                                                        message: 'is invalid SO term' }
    # validates :rs, allow_nil: true, format: { with: /\Ars\d+\z/, message: 'is invalid RefSNP ID' }

    def initialize(**attributes)
      attributes.each do |k, v|
        send("#{k}=", v)
      end
      yield self if block_given?
    end

    # @return [Array<RDF::Statement>]
    def to_rdf(subject = RDF::Node.new)
      validate!

      graph = RDF::Graph.new
      graph << [subject, TgvLookup.chromosome, chromosome]
      graph << [subject, TgvLookup.position, position]
      graph << [subject, TgvLookup.ref, reference] if reference
      graph << [subject, TgvLookup.alt, alternative] if alternative
      graph << [subject, TgvLookup.variant_class, variant_class]
      graph << [subject, TgvLookup.rs, rs] if rs
      graph
    end
  end
end
