class Lookup
  class ExAC
    include ActiveModel::Validations

    attr_accessor :num_alt_alleles
    attr_accessor :num_alleles
    attr_accessor :frequency

    validates :num_alt_alleles, numericality: { only_integer: true,
                                                greater_than_or_equal_to: 0 }
    validates :num_alleles, numericality: { only_integer: true,
                                            greater_than_or_equal_to: 0 }
    validates :frequency, numericality: { greater_than_or_equal_to: 0 }

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
      graph << [subject, TgvLookup.num_alt_alleles, num_alt_alleles] if num_alt_alleles
      graph << [subject, TgvLookup.num_alleles, num_alleles] if num_alleles
      graph << [subject, TgvLookup.frequency, frequency] if frequency
    end
  end
end