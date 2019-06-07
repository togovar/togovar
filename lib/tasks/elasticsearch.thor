require 'awesome_print'
require 'faraday'
require 'thor'
require 'elasticsearch/model'

module TogoVar
  class Elasticsearch < Thor

    namespace 'togovar elasticsearch'

    desc 'health', 'health check'

    def health
      require_relative '../../config/environment'

      ap ::Elasticsearch::Model.client.cluster.health
    end

    desc 'init', 'initialize elasticsearch for TogoVar'

    def init
      require_relative '../../config/environment'

      set_template_replica

      create 'variant'
      create 'gene_symbol'
      create 'disease'
    end

    desc 'create [name = variant|gene_symbol|disease]', 'create index'

    def create(name)
      require_relative '../../config/environment'

      model = name.camelize.safe_constantize

      unless model
        STDERR.puts "Model #{name} not found."
        return
      end

      hash = {
        "#{name}": {
          mappings: model::Elasticsearch.mappings.to_hash,
          settings: model::Elasticsearch.settings.to_hash
        }
      }
      puts JSON.pretty_generate(hash)

      if yes? "Index #{name} will be created with these settings. Are you sure? [y/n]"
        model::Elasticsearch.__elasticsearch__.create_index!
      else
        STDERR.puts 'Aborted.'
      end
    end

    desc 'delete [name = variant|gene_symbol|disease]', 'delete index'

    def delete(name)
      require_relative '../../config/environment'

      model = name.camelize.safe_constantize

      unless model
        STDERR.puts "Model #{name} not found."
        return
      end

      if yes? "Index #{name} will be deleted. Are you sure? [y/n]"
        model::Elasticsearch.__elasticsearch__.delete_index!
      else
        STDERR.puts 'Aborted.'
      end
    end

    def self.banner(task, namespace = false, subcommand = true)
      super
    end

    private

    def connection
      @connection ||= begin
        url = Rails.configuration.elasticsearch['host']

        ::Faraday::Connection.new url.match?(/^https?:\/\//) ? url : "http://#{url}"
      end
    end

    def request(method, path, body, header)
      response = connection.run_request method, path, (body ? MultiJson.dump(body) : nil), header

      puts response.body
      puts
    end

    def set_template_replica
      header = {
        'Content-Type': 'application/json'
      }
      body = {
        template: '*',
        settings: {
          number_of_shards: 1,
          number_of_replicas: 0
        }
      }

      request :put, '/_template/replica', body, header
    end
  end
end
