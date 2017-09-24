require 'linkeddata'

module Queryable
  extend ActiveSupport::Concern

  DEFAULT_OPTIONS = { method:   SPARQL::Client::DEFAULT_METHOD,
                      protocol: SPARQL::Client::DEFAULT_PROTOCOL }.freeze

  ACCEPTABLE_KEYS = %i[method protocol headers read_timeout].freeze

  module ClassMethods
    def query(sparql, options = {})
      digest = Digest::MD5.hexdigest(sparql)

      start = Time.now
      arr = ["started query for #{Endpoint.url} at #{Time.now}",
             "  Cache: #{Rails.cache.exist?(digest)}",
             "  Query: #{sparql.gsub(/^\s+/, '').tr("\n", ' ')}"]

      options = DEFAULT_OPTIONS.merge(options.slice(*ACCEPTABLE_KEYS))

      json = []
      begin
        json = Rails.cache.fetch(digest, expires_in: 1.month) do
          client = SPARQL::Client.new(Endpoint.url, options)
          result = client.query(sparql, content_type: SPARQL::Client::RESULT_JSON)
          JSON.parse(result.to_json)
        end
      rescue StandardError => se
        arr << format('  Elapse: %.3f [s]', (Time.now - start))
        arr << "  Error: #{se.message}\n"
        Rails.logger.error(arr.join("\n"))
      end

      arr << format("  Elapse: %.3f [s]\n", (Time.now - start))
      Rails.logger.info(arr.join("\n"))

      return [] unless (r = json['results']) && (b = r['bindings']) && !b.empty?

      json['results']['bindings'].map do |bind|
        json['head']['vars'].each_with_object({}) do |key, hash|
          hash[key.to_sym] = bind[key]['value'] if bind.key?(key)
        end
      end
    end
  end
end