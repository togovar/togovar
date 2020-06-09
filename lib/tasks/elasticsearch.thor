require_relative '../../config/application'
require 'thor'

Rails.application.initialize! unless Rails.application.initialized?

module Tasks
  class Elasticsearch < Thor
    namespace :elasticsearch

    desc 'health', 'Check cluster health'

    def health
      ap ::Elasticsearch::Model.client.cluster.health
    end

    desc 'init', 'Initialize and create all indices'

    def init
      set_template_replica

      %w[variation gene_symbol disease].each { |x| create_index x }
    end

    desc 'create_index', 'Create index'

    def create_index(name)
      unless (model = name.camelize.safe_constantize)
        warn "Class not found: #{name}"
        return
      end

      unless model.respond_to?(:__elasticsearch__)
        warn "#{model} is not a model for elasticsearch."
        return
      end

      model.__elasticsearch__.create_index!
    end

    desc 'delete_index', 'Delete index'

    def delete_index(name)
      unless (model = name.camelize.safe_constantize)
        warn "Class not found: #{name}"
        return
      end

      unless model.respond_to?(:__elasticsearch__)
        warn "#{model} is not a elasticsearch model."
        return
      end

      model.__elasticsearch__.delete_index! if yes? "Delete #{model.index_name}. Are you sure? [y/n]"
    end

    private

    def set_template_replica
      method = ::Elasticsearch::API::HTTP_PUT
      path = '_template/replica'
      params = {}
      body = {
        template: '*',
        settings: {
          number_of_shards: 1,
          number_of_replicas: 0
        }
      }
      headers = {
        'Content-Type': 'application/json'
      }

      ::Elasticsearch::Model.client.perform_request(method, path, params, body, headers)
    end
  end
end
