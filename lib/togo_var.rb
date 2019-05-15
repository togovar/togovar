module TogoVar
  module IO
    require 'togo_var/io/multi_g_zip_reader'
    require 'togo_var/io/ndjson'
    require 'togo_var/io/vcf'
    require 'togo_var/io/vep'
  end

  module Models
    require 'togo_var/models/condition'
    require 'togo_var/models/disease'
    require 'togo_var/models/frequency'
    require 'togo_var/models/gene_symbol'
    require 'togo_var/models/transcript'
    require 'togo_var/models/variant'
  end
end
