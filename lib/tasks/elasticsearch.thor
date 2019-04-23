require 'thor'
require 'elasticsearch/model'

module TogoVar
  class Elasticsearch < Thor

    desc 'health', 'health check'
    def health
      require_relative '../../config/environment'

      ap ::Elasticsearch::Model.client.cluster.health
    end

    desc 'create [name = variants|gene_symbols|diseases]', <<~DESC
      create index (create all indices if no arguments given)
    DESC
    def create(name = nil)
      require_relative '../../config/environment'

      Variant::Elasticsearch.__elasticsearch__.create_index! if name.nil? || name == 'variants'
      GeneSymbol::Elasticsearch.__elasticsearch__.create_index! if name.nil? || name == 'gene_symbols'
      Disease::Elasticsearch.__elasticsearch__.create_index! if name.nil? || name == 'diseases'
    end

    desc 'delete [name = variants|gene_symbols|diseases]', <<~DESC
      delete index (delete all indices if no arguments given)
    DESC
    def delete(name = nil)
      require_relative '../../config/environment'

      Variant::Elasticsearch.__elasticsearch__.delete_index! if name.nil? || name == 'variants'
      GeneSymbol::Elasticsearch.__elasticsearch__.delete_index! if name.nil? || name == 'gene_symbols'
      Disease::Elasticsearch.__elasticsearch__.delete_index! if name.nil? || name == 'diseases'
    end

    def self.banner(task, namespace = false, subcommand = true)
      super
    end
  end
end
