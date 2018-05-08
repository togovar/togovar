require 'identifiers'

class Lookup
  extend ActiveModel::Naming
  include ActiveModel::Validations

  include Lookup::Queryable
  include Lookup::Searchable

  CHROMOSOME = (1..22).map(&:to_s).concat(%w[X Y MT]).freeze
  NUCLEOBASE = /\A[ATGCURYMKSWBHVDN]+\z/

  class << self
    # tgv_id # sortable
    # chromosome # sortable
    # start # sortable
    # stop # sortable
    # variant_type # filterable
    # reference
    # alternative
    # rs
    # transcripts
    # clinvar
    # exac
    # jga_ngs
    # jga_snp
    # hgvd
    # tommo
    ATTRIBUTES = %i[tgv_id chromosome start stop variant_type reference
                    alternative rs hgvs_g transcripts clinvar exac jga_ngs
                    jga_snp hgvd tommo].freeze

    def attributes
      ATTRIBUTES
    end
  end

  attributes.each do |name|
    attr_accessor name
  end

  validates :tgv_id, presence: true, numericality: { only_integer: true, greater_than: 0 }
  validates :chromosome, allow_nil: true, inclusion: { in: CHROMOSOME, message: 'invalid chromosome' }
  validates :start, allow_nil: true, numericality: { only_integer: true, greater_than: 0 }
  validates :stop, allow_nil: true, numericality: { only_integer: true, greater_than: 0 }
  validates :variant_type, allow_nil: true, format: { with: /\ASO_\d+\z/, message: 'is invalid SO term' }
  validates :reference, allow_nil: true, format: { with: NUCLEOBASE, message: 'has invalid nucleobase' }
  validates :alternative, allow_nil: true, format: { with: NUCLEOBASE, message: 'has invalid nucleobase' }
  validates :rs, allow_nil: true, array_of: { type: String }

  validates :transcripts, allow_nil: true, array_of: { type: Transcript }
  validates :clinvar, allow_nil: true, type: { type: ClinVar }
  validates :jga_ngs, allow_nil: true, type: { type: JGA::NGS }
  validates :jga_snp, allow_nil: true, type: { type: JGA::SNP }
  validates :tommo, allow_nil: true, type: { type: ToMMo }
  validates :hgvd, allow_nil: true, type: { type: HGVD }
  validates :exac, allow_nil: true, type: { type: ExAC }

  def initialize(**attributes)
    if attributes[:transcripts].is_a?(Array) && attributes[:transcripts].first.is_a?(Hash)
      array = attributes.delete(:transcripts)
      attributes[:transcripts] = array.map { |x| Transcript.new(x) }
    end
    if attributes[:clinvar].is_a? Hash
      hash = attributes.delete(:clinvar)
      attributes[:clinvar] = ClinVar.new(hash)
    end
    if attributes[:jga_ngs].is_a? Hash
      hash = attributes.delete(:jga_ngs)
      attributes[:jga_ngs] = JGA::NGS.new(hash)
    end
    if attributes[:jga_snp].is_a? Hash
      hash = attributes.delete(:jga_snp)
      attributes[:jga_snp] = JGA::SNP.new(hash)
    end
    if attributes[:tommo].is_a? Hash
      hash = attributes.delete(:tommo)
      attributes[:tommo] = ToMMo.new(hash)
    end
    if attributes[:hgvd].is_a? Hash
      hash = attributes.delete(:hgvd)
      attributes[:hgvd] = HGVD.new(hash)
    end
    if attributes[:exac].is_a? Hash
      hash = attributes.delete(:exac)
      attributes[:exac] = ExAC.new(hash)
    end

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
  def to_rdf(annotation_only = false)
    validate!

    s = RDF::URI("http://togovar.org/variation/#{tgv_id}")

    graph = RDF::Graph.new

    unless annotation_only
      graph << [s, RDF.type, RDF::URI('http://togovar.org/ontology/Variation')]
      graph << [s, RDF::Vocab::DC.identifier, tgv_id]

      graph << [s, Tgvl[:chromosome], chromosome]
      graph << [s, Tgvl[:start], start]
      graph << [s, Tgvl[:stop], stop]
      graph << [s, Tgvl[:variant_type], Obo[variant_type]]
      graph << [s, Tgvl[:ref], reference] if reference
      graph << [s, Tgvl[:alt], alternative] if alternative
      rs&.each do |x|
        graph << [s, Tgvl[:rs], Identifiers::DBSNP[x]]
      end
      graph << [s, Tgvl[:hgvs_g], hgvs_g] if hgvs_g

      transcripts&.each do |t|
        bn = RDF::Node.new
        gr = t.to_rdf(bn)

        graph << [s, Tgvl[:transcript], bn]
        graph.insert(*gr.statements)
      end
    end

    %i[clinvar exac jga_ngs jga_snp hgvd tommo].each do |name|
      data = method(name).call
      next unless data

      bn = RDF::Node.new
      graph << [s, Tgvl[name], bn]
      graph.insert(*data.to_rdf(bn).statements)
    end

    graph
  end
end

class Tgvl < RDF::Vocabulary('http://togovar.org/lookup#');
end
