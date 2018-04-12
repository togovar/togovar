class Lookup
  extend ActiveModel::Naming
  include ActiveModel::Validations

  include Lookup::Queryable
  include Lookup::Searchable

  class << self
    # tgv_id # sortable
    # base
    # molecular_annotation
    # clinvar
    # exac
    # jga_ngs
    # jga_snp
    # hgvd
    # tommo
    ATTRIBUTES = %i[tgv_id base molecular_annotation clinvar exac jga_ngs jga_snp hgvd tommo].freeze

    def attributes
      ATTRIBUTES
    end
  end

  attributes.each do |name|
    attr_accessor name
  end

  validates :tgv_id, presence: true, numericality: { only_integer: true,
                                                     greater_than: 0 }
  validates :base, allow_nil: true, type: { type: BaseInfo }
  validates :molecular_annotation, allow_nil: true, type: { type: MolecularAnnotation }
  validates :clinvar, allow_nil: true, type: { type: ClinVar }
  validates :exac, allow_nil: true, type: { type: ExAC }
  validates :jga_ngs, allow_nil: true, type: { type: JGA::NGS }
  validates :jga_snp, allow_nil: true, type: { type: JGA::SNP }
  validates :hgvd, allow_nil: true, type: { type: HGVD }
  validates :tommo, allow_nil: true, type: { type: ToMMo }

  def initialize(**attributes)
    attributes.each do |k, v|
      send("#{k}=", v)
    end
    yield self if block_given?
  end

  def attributes
    self.class.attributes.map do |name|
      v = send(name)
      v = v.attributes if v.respond_to?(:attributes)
      [name, v]
    end.to_h
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

    %i[clinvar exac jga_ngs jga_snp hgvd tommo].each do |name|
      data = method(name).call
      next unless data

      bn = RDF::Node.new
      graph << [s, TgvLookup[name], bn]
      graph.insert(*data.to_rdf(bn).statements)
    end

    graph
  end
end
