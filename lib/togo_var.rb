# TODO: remove if unused
module TogoVar
  CONSEQUENCE_KEYS = %w[Allele Consequence IMPACT SYMBOL Gene Feature_type Feature BIOTYPE EXON INTRON HGVSc HGVSp
                      cDNA_position CDS_position Protein_position Amino_acids Codons Existing_variation DISTANCE
                      STRAND FLAGS VARIANT_CLASS SYMBOL_SOURCE HGNC_ID SIFT PolyPhen HGVS_OFFSET HGVSg CLIN_SIG
                      SOMATIC PHENO].freeze

  CHROM_INDEX = ('1'..'22').to_a.concat(%w[X Y MT]).zip((1..25)).to_h

  SO_VARIANT_TYPE = Hash.new { |hash, key| hash[key] = SequenceOntology.find_by_label(key) }
  SO_CONSEQUENCE = Hash.new { |hash, key| hash[key] = SequenceOntology.find_by_label(key) }

  module REGEX
    REAL_NUMBER = /[+-]?(?:\d+\.?\d*|\.\d+)/
  end

  require 'togo_var/multi_g_zip_reader'
  require 'togo_var/ndjson'
  require 'togo_var/rdf'
  require 'togo_var/vcf'

  module Util
    require 'togo_var/util/variation'
  end
end
