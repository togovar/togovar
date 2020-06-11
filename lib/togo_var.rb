module TogoVar
  module DataSource
    module Clinvar
      module API
        require 'togo_var/data_source/clinvar/api/client'
      end
      require 'togo_var/data_source/clinvar/elasticsearch_extension'
    end

    module Vep
      require 'togo_var/data_source/vep/elasticsearch_extension'
    end
  end

  module Elasticsearch
    require 'togo_var/elasticsearch/bulk_data_builder'
  end

  module IO
    require 'togo_var/io/multi_g_zip_reader'
    require 'togo_var/io/ndjson'
    require 'togo_var/io/vcf'
  end

  module Models
    require 'togo_var/models/condition'
    require 'togo_var/models/disease'
    require 'togo_var/models/frequency'
    require 'togo_var/models/gene_symbol'
    require 'togo_var/models/transcript'
    require 'togo_var/models/variant'
  end

  module Util
    require 'togo_var/util/variation'
  end
end
