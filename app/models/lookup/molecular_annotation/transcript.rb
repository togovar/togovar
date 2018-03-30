class Lookup
  class MolecularAnnotation
    class Transcript
      include ActiveModel::Validations

      attr_accessor :variant_class
      attr_accessor :consequences
      attr_accessor :hgvs_c
      attr_accessor :sift
      attr_accessor :polyphen

      validates :variant_class, presence: true, format: { with:    /\ASO_\d+\z/,
                                                          message: 'is invalid SO term' }
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

      # @return [Array<RDF::Statement>]
      def to_rdf(subject = RDF::Node.new)
        validate!

        graph = RDF::Graph.new

        graph << [subject, TgvLookup[:variant_class], variant_class]
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
