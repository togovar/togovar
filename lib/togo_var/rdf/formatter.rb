module TogoVar
  module RDF
    module Formatter
      VARIATION_SUBJECT_FORMAT = 'http://identifiers.org/hco/%s/GRCh37#%d-%s-%s'.freeze

      require 'togo_var/rdf/formatter/vep'
      require 'togo_var/rdf/formatter/clin_var'
      require 'togo_var/rdf/formatter/frequency'
    end
  end
end
