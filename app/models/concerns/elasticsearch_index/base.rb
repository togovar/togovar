module ElasticsearchIndex
  module Base
    extend ActiveSupport::Concern

    module ClassMethods
      # @return [Integer] number of total records
      def count
        es.count(index: index_name).dig('count')
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

        es.perform_request(method, path, params, body, headers)
      end

      # @return [Elasticsearch::Transport::Client] elasticsearch client
      def es
        __elasticsearch__.client
      end
    end
  end
end
