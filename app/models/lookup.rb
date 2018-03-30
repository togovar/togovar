class Lookup
  extend ActiveModel::Naming
  include ActiveModel::Validations

  include Lookup::Searchable

  attr_accessor :tgv_id

  attr_accessor :base
  attr_accessor :molecular_annotation
  attr_accessor :clinvar
  attr_accessor :exac
  attr_accessor :jga

  validates :tgv_id, presence: true, numericality: { only_integer: true,
                                                     greater_than: 0 }
  validates :base, allow_nil: true, type: { type: BaseInfo }
  validates :molecular_annotation, allow_nil: true, type: { type: MolecularAnnotation }
  validates :clinvar, allow_nil: true, type: { type: ClinVar }
  validates :exac, allow_nil: true, type: { type: ExAC }
  validates :jga, allow_nil: true, type: { type: JGA }

  def initialize(**attributes)
    attributes.each do |k, v|
      send("#{k}=", v)
    end
    yield self if block_given?
  end

  # @return [Array<RDF::Statement>]
  def to_rdf
    validate!

    s = RDF::URI("http://togovar.org/variation/#{tgv_id}")

    graph = RDF::Graph.new
    graph << [s, RDF::Vocab::DC.identifier, tgv_id]

    %i[base molecular_annotation].each do |attr|
      data = method(attr).call
      next if data.nil?

      graph.insert(*data.to_rdf(s).statements)
    end

    if clinvar
      bn = RDF::Node.new
      graph << [s, TgvLookup[:clinvar], bn]
      graph.insert(*clinvar.to_rdf(s).statements)
    end

    graph
  end
end
