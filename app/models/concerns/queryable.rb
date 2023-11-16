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
      ep     = options.delete(:endpoint) || Rails.configuration.endpoint['sparql']
      digest = Digest::MD5.hexdigest(sparql)

      arr = ["started query for #{ep} at #{Time.now}",
             "  Cache: #{Rails.cache.exist?(digest) && digest}",
             "  Query: #{sparql.indent(9, ' ')}"]

      result = []
      time = Benchmark.realtime do
        begin
          result = Rails.cache.fetch(digest, expires_in: 1.month) do
            options = DEFAULT_OPTIONS.merge(options.slice(*ACCEPTABLE_KEYS))
            client  = SPARQL::Client.new(ep, **options)
            client.query(sparql, content_type: SPARQL::Client::RESULT_JSON)
          end
        rescue StandardError => se
          arr << "  Error: #{se.message}"
          arr << se.backtrace.join("\n")
        end
      end

      arr << format("  Elapse: %.3f [s]\n", time)

      log(*arr)

      format_result(result)
    end

    private

    def log(*args)
      severity = args.any? { |x| x.strip =~ /^Error:/ } ? :error : :info
      Rails.logger.send(severity, args.join("\n"))
    end

    def format_result(result)
      # raise TypeError unless result.is_a?(RDF::Query::Solutions)
      return {} unless result.is_a?(RDF::Query::Solutions)

      (0...result.count).map do |i|
        result.bindings.map do |k, v|
          [k, typed(v[i])]
        end.to_h
      end
    end

    def typed(term)
      case term
      when RDF::Literal::Boolean
        return true if term.true?
        false
      when RDF::Literal::Date
        Date.parse(term.to_s)
      when RDF::Literal::Time
        Time.parse(term.to_s)
      when RDF::Literal::DateTime
        DateTime.parse(term.to_s)
      when RDF::Literal::Integer
        term.to_s.to_i
      when RDF::Literal::Double, RDF::Literal::Float
        term.to_s.to_f
      when RDF::Literal::Numeric, RDF::Literal::Decimal
        term.to_s.to_d
      else
        term.to_s
      end
    end

  end
end
