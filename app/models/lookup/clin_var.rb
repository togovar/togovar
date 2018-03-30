class Lookup
  class ClinVar
    include ActiveModel::Validations

    attr_accessor :allele_id
    attr_accessor :significances
    attr_accessor :conditions

    validates :allele_id, numericality: { only_integer: true,
                                          greater_than: 0 }
    validates :significances, array_of: { type: String }
    validates :conditions, array_of: { type: String }

    def initialize(**attributes)
      @significances = []
      @conditions = []
      attributes.each do |k, v|
        send("#{k}=", v)
      end
      yield self if block_given?
    end

    def to_rdf(subject = RDF::Node.new)
      validate!

      graph = RDF::Graph.new

      graph << [subject, TgvLookup.allele_id, allele_id] if allele_id
      significances&.each do |x|
        graph << [subject, TgvLookup.significances, x]
      end
      conditions&.each do |x|
        graph << [subject, TgvLookup.conditions, x]
      end

      graph
    end
  end
end
