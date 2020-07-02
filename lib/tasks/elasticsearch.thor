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

      %w[variation gene disease].each { |x| create_index x }
    end

    desc 'set_template_replica', 'Make settings for replica template smallest'

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

    desc 'create_index index_name', 'Create index'

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

    desc 'delete_index index_name', 'Delete index'

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

    desc 'refresh_interval index_name [interval]', 'Set refresh interval'

    def refresh_interval(name, value = nil)
      unless (model = name.camelize.safe_constantize)
        warn "Class not found: #{name}"
        return
      end

      unless model.respond_to?(:__elasticsearch__)
        warn "#{model} is not a model for elasticsearch."
        return
      end

      i = begin
            Integer(value)
          rescue
            value
          end

      model.set_refresh_interval(i)
    end
  end
end
