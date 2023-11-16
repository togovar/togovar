module ElasticsearchIndex
  module Base
    extend ActiveSupport::Concern

    module ClassMethods
      def create_index_body(pretty: false)
        hash = { settings: settings.to_hash, mappings: mappings.to_hash }

        pretty ? JSON.pretty_generate(hash) : hash.to_json
      end

      # @return [Integer] number of total records
      def count(arguments = {})
        arguments.merge!(index: index_name)

        __elasticsearch__.client.count(arguments)&.dig('count')
      end

      def find(*id)
        query = Elasticsearch::DSL::Search.search do
          query do
            terms id: id
          end
        end

        __elasticsearch__.search(query)
      end

      # @param [String,Integer] interval -1 to disable soft commit, nil to reset setting
      def set_refresh_interval(interval = nil)
        method = ::Elasticsearch::API::HTTP_PUT
        path = "#{index_name}/_settings"
        params = {}
        body = {
          index: {
            refresh_interval: interval
          }
        }
        headers = {
          'Content-Type': 'application/json'
        }

        __elasticsearch__.client.perform_request(method, path, params, body, headers)
      end

      # @return [Elasticsearch::Transport::Client] elasticsearch client
      def es
        __elasticsearch__.client
      end
    end
  end
end
