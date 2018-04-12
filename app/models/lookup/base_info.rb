class Lookup
  class BaseInfo
    include ActiveModel::Validations

    CHROMOSOME = (1..22).map(&:to_s).concat(%w[X Y MT]).freeze
    NUCLEOBASE = /\A[ATGCURYMKSWBHVDN]+\z/

    class << self
      # chromosome # sortable
      # start # sortable
      # stop # sortable
      # variant_type # filterable
      # reference
      # alternative
      # rs
      ATTRIBUTES = %i[chromosome start stop variant_type reference alternative rs].freeze

      def attributes
        ATTRIBUTES
      end
    end

    attributes.each do |name|
      attr_accessor name
    end

    validates :chromosome, presence: true, inclusion: { in:      CHROMOSOME,
                                                        message: 'invalid chromosome' }
    validates :start, presence: true, numericality: { only_integer: true,
                                                      greater_than: 0 }
    validates :stop, presence: true, numericality: { only_integer: true,
                                                     greater_than: 0 }
    validates :variant_type, presence: true, format: { with:    /\ASO_\d+\z/,
                                                       message: 'is invalid SO term' }
    validates :reference, allow_nil: true, format: { with:    NUCLEOBASE,
                                                     message: 'has invalid nucleobase' }
    validates :alternative, allow_nil: true, format: { with:    NUCLEOBASE,
                                                       message: 'has invalid nucleobase' }
    validates :rs, allow_nil: true, array_of: { type: String }

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

      graph << [subject, TgvLookup[:chromosome], chromosome]
      graph << [subject, TgvLookup[:start], start]
      graph << [subject, TgvLookup[:stop], stop]
      graph << [subject, TgvLookup[:variant_type], variant_type]
      graph << [subject, TgvLookup[:ref], reference] if reference
      graph << [subject, TgvLookup[:alt], alternative] if alternative
      rs&.each do |x|
        graph << [subject, TgvLookup[:rs], x]
      end
      graph
    end
  end
end
