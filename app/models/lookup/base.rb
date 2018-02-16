module Lookup
  class Base
    include Mongoid::Document

    field :tgv_id
    field :chromosome
    field :position
    field :allele
    field :gene
    field :existing_variation
    field :symbol
    field :sift
    field :polyphen

    embeds_many :transcripts
  end

  class Transcript
    include Mongoid::Document

    field :consequence, type: Array
    field :variant_class
    field :hgvsc

    embedded_in :base, inverse_of: :transcripts
  end
end
