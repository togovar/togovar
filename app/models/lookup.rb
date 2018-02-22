class Lookup
  include Mongoid::Document

  field :tgv_id

  embeds_one :base, class_name: 'Lookup::Base'
  embeds_one :molecular_annotation, class_name: 'Lookup::MolecularAnnotation'
  embeds_one :clinvar, class_name: 'Lookup::ClinVar'
  embeds_one :exac, class_name: 'Lookup::ExAC'
  embeds_one :jga, class_name: 'Lookup::JGA'

  class << self
    def list(params)
      result = Base.order_by(tgv_id: 'asc')
                 .skip(params['start'])
                 .limit(params['length'])

      { recordsTotal:    Base.all.count,
        recordsFiltered: result.count,
        data:            result }
    end
  end

  class Base
    include Mongoid::Document

    field :chromosome
    field :position, type: Integer
    field :allele
    field :existing_variation
    field :variant_class

    embedded_in :lookup, inverse_of: :base
  end

  class MolecularAnnotation
    include Mongoid::Document

    field :gene
    field :symbol

    embeds_many :transcripts

    embedded_in :lookup, inverse_of: :molecular_annotation
  end

  class Transcript
    include Mongoid::Document

    field :consequences, type: Array
    field :impact
    field :hgvsc

    embeds_one :sift
    embeds_one :polyphen

    embedded_in :molecular_annotation, inverse_of: :transcripts
  end

  class Sift
    include Mongoid::Document

    field :prediction
    field :value, type: Float

    embedded_in :transcript, inverse_of: :sift
  end

  class Polyphen
    include Mongoid::Document

    field :prediction
    field :value, type: Float

    embedded_in :transcript, inverse_of: :polyphen
  end

  class ClinVar
    include Mongoid::Document

    field :allele_id, type: Integer

    embedded_in :lookup, inverse_of: :clinvar
  end

  class ExAC
    include Mongoid::Document

    field :num_alleles, type: Integer
    field :num_alt_alleles, type: Integer
    field :num_homo_genotypes, type: Integer
    field :frequency, type: Float

    embedded_in :lookup, inverse_of: :exac
  end

  class JGA
    include Mongoid::Document

    field :num_alt_alleles, type: Integer
    field :frequency, type: Float

    embedded_in :lookup, inverse_of: :jga
  end
end
