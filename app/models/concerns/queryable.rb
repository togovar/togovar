require 'linkeddata'
require 'benchmark'

module Queryable
  extend ActiveSupport::Concern

  DEFAULT_OPTIONS = { method:   SPARQL::Client::DEFAULT_METHOD,
                      protocol: SPARQL::Client::DEFAULT_PROTOCOL }.freeze

  ACCEPTABLE_KEYS = %i[method protocol headers read_timeout].freeze

  module ClassMethods
    # @param [String] sparql query
    # @param [Hash] options :endpoint, :method, :protocol, :headers, :read_timeout
    # @see SPARQL::Client
    def query(sparql, **options)
      ep     = options.delete(:endpoint) || Endpoint.url
      digest = Digest::MD5.hexdigest(normalize(sparql))

      arr = ["started query for #{ep} at #{Time.now}",
             "  Cache: #{Rails.cache.exist?(digest) && digest}",
             "  Query: #{normalize sparql}"]

      json = []
      time = Benchmark.realtime do
        begin
          json = Rails.cache.fetch(digest, expires_in: 1.month) do
            options = DEFAULT_OPTIONS.merge(options.slice(*ACCEPTABLE_KEYS))
            client  = SPARQL::Client.new(ep, options)
            result  = client.query(sparql, content_type: SPARQL::Client::RESULT_JSON)
            JSON.parse(result.to_json)
          end
        rescue StandardError => se
          arr << "  Error: #{se.message}"
          arr << se.backtrace.join("\n")
        end
      end

      arr << format("  Elapse: %.3f [s]\n", time)

      log(*arr)

      format_result(json)
    end

    private

    def normalize(sparql)
      sparql.gsub(/^\s+\n/, '').gsub(/^\s+|\s+$/, '').tr("\n", ' ')
    end

    def log(*args)
      severity = args.any? { |x| x.strip =~ /^Error:/ } ? :error : :info
      Rails.logger.send(severity, args.join("\n"))
    end

    def format_result(result)
      return result unless result.is_a?(Hash)

      return [] unless (r = result['results']) && (bindings = r['bindings']) && !bindings.empty?

      bindings.map do |bind|
        result['head']['vars'].each_with_object({}) do |key, hash|
          hash[key.to_sym] = bind[key]['value'] if bind.key?(key)
        end
      end
    end

  end
end
