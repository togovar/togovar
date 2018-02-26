class Lookup
  include Mongoid::Document

  include Lookup::Searchable

  field :tgv_id

  embeds_one :base, class_name: 'Lookup::Base'
  embeds_one :molecular_annotation, class_name: 'Lookup::MolecularAnnotation'
  embeds_one :clinvar_info, class_name: 'Lookup::ClinVar' # FIXME
  embeds_one :clinvar, class_name: 'Lookup::ExAC' # FIXME
  embeds_one :jga, class_name: 'Lookup::JGA'

  include VariantClass
  include TermType

  class << self
    def list(params)
      term   = term_type(params['term'].strip)
      start  = params['start'].to_i || 0
      length = params['length'].to_i || 10

      puts term

      result = (term ? where(term.where) : all)
                 .order_by(tgv_id: 'asc')
                 .skip(start)
                 .limit(length)

      # FIXME: insert SO label into base.variant_class
      replace = result.map do |r|
        json = r.as_json
        if (base = r[:base])
          if (var_class = base[:variant_class])
            base[:variant_class] = label(var_class)
            json.merge(base: base)
          else
            json
          end
        else
          json
        end
      end

      { recordsTotal:    Base.all.count,
        recordsFiltered: result.count,
        data:            replace }
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
    field :significance
    field :conditions, type: Array

    embedded_in :lookup, inverse_of: :clinvar_info # FIXME
  end

  class ExAC
    include Mongoid::Document

    field :num_alt_alleles, type: Integer
    field :num_alleles, type: Integer
    field :frequency, type: Float

    embedded_in :lookup, inverse_of: :clinvar # FIXME
  end

  class JGA
    include Mongoid::Document

    field :num_alt_alleles, type: Integer
    field :num_alleles, type: Integer
    field :frequency, type: Float

    embedded_in :lookup, inverse_of: :jga
  end
end
