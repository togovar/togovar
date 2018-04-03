class Lookup
  class BaseInfo
    include ActiveModel::Validations

    CHROMOSOME = (1..22).map(&:to_s).concat(%w[X Y MT]).freeze
    NUCLEOBASE = /\A[ATGCURYMKSWBHVDN]+\z/

    attr_accessor :chromosome
    attr_accessor :start
    attr_accessor :stop
    attr_accessor :reference
    attr_accessor :alternative
    attr_accessor :rs

    validates :chromosome, presence: true, inclusion: { in:      CHROMOSOME,
                                                        message: 'invalid chromosome' }
    validates :start, presence: true, numericality: { only_integer: true,
                                                      greater_than: 0 }
    validates :stop, presence: true, numericality: { only_integer: true,
                                                     greater_than: 0 }
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

    # @return [Array<RDF::Statement>]
    def to_rdf(subject = RDF::Node.new)
      validate!

      graph = RDF::Graph.new

      graph << [subject, TgvLookup[:chromosome], chromosome]
      graph << [subject, TgvLookup[:start], start]
      graph << [subject, TgvLookup[:stop], stop]
      graph << [subject, TgvLookup[:ref], reference] if reference
      graph << [subject, TgvLookup[:alt], alternative] if alternative
      rs&.each do |x|
        graph << [subject, TgvLookup[:rs], x]
      end
      graph
    end
  end
end
