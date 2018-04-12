class Lookup
  class MolecularAnnotation
    class Transcript
      include ActiveModel::Validations

      class << self
        # consequences
        # hgvs_c
        # sift
        # polyphen
        ATTRIBUTES = %i[consequences hgvs_c sift polyphen].freeze

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

      def initialize(**attributes)
        @consequences = []
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

        consequences&.each do |x|
          graph << [subject, TgvLookup[:consequence], x]
        end
        graph << [subject, TgvLookup[:hgvs_c], hgvs_c] if hgvs_c
        graph << [subject, TgvLookup[:sift], sift] if sift
        graph << [subject, TgvLookup[:polyphen], polyphen] if polyphen

        graph
      end
    end
  end
end
