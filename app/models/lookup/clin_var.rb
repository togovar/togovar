class Lookup
  class ClinVar
    include ActiveModel::Validations

    class << self
      # allele_id
      # significances # filterable
      # conditions
      ATTRIBUTES = %i[allele_id significances conditions].freeze

      def attributes
        ATTRIBUTES
      end
    end

    attributes.each do |name|
      attr_accessor name
    end

    def initialize(**attributes)
      @significances = []
      @conditions = []
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

      graph << [subject, Tgvl[:allele_id], allele_id] if allele_id
      significances&.each do |x|
        graph << [subject, Tgvl[:significances], x]
      end
      conditions&.each do |x|
        graph << [subject, Tgvl[:conditions], x]
      end

      graph
    end
  end
end
