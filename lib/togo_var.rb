module TogoVar
  module DataSource
    module Clinvar
      require 'togo_var/data_source/clinvar/elasticsearch_extension'
    end

    module VEP
      CONSEQUENCE_KEYS = %w[Allele Consequence IMPACT SYMBOL Gene Feature_type Feature BIOTYPE EXON INTRON HGVSc HGVSp
                      cDNA_position CDS_position Protein_position Amino_acids Codons Existing_variation DISTANCE
                      STRAND FLAGS VARIANT_CLASS SYMBOL_SOURCE HGNC_ID SIFT PolyPhen HGVS_OFFSET HGVSg CLIN_SIG
                      SOMATIC PHENO].freeze

      CHROM_INDEX = ('1'..'22').to_a.concat(%w[X Y MT]).zip((1..25)).to_h

      REAL_NUMBER_REGEX = /[+-]?(?:\d+\.?\d*|\.\d+)/

      require 'togo_var/data_source/vep/elasticsearch_extension'
      require 'togo_var/data_source/vep/rdf_extension'
    end
  end

  module Elasticsearch
    require 'togo_var/elasticsearch/bulk_data_builder'
  end

  module IO
    require 'togo_var/io/multi_g_zip_reader'
    require 'togo_var/io/vcf'
  end

  module RDF
    require 'togo_var/rdf/formatter'
  end

  module Util
    require 'togo_var/util/variation'
  end
end
