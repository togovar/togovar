require 'active_support'
require 'active_support/core_ext'
require 'json'

module TogoVar
  module Models
    class Disease

      class << self

        SPARQL_LIMIT_PER_QUERY = 1000

        def distinct
          config = Rails.configuration.endpoint
          endpoint = SPARQL::Client.new(config['url'])

          i = 0
          buf = []

          loop do
            result = endpoint.query(<<~SPARQL)
              PREFIX cvo: <http://purl.jp/bio/10/clinvar/>
              PREFIX vcv: <http://identifiers.org/clinvar:>

              SELECT DISTINCT ?condition
              FROM <http://togovar.biosciencedbc.jp/graph/clinvar>
              WHERE {
                ?vcv cvo:interpreted_record/cvo:rcv_list/cvo:rcv_accession/cvo:interpreted_condition/cvo:type_rcv_interpreted_condition ?condition .
              }
              LIMIT #{SPARQL_LIMIT_PER_QUERY}
              OFFSET #{SPARQL_LIMIT_PER_QUERY * i}
            SPARQL

            break if result.empty?

            buf.concat(result.bindings[:condition].map(&:value).map do |condition|
              new do |x|
                x.term = condition
              end
            end)

            i += 1
          end

          buf
        end
      end

      ATTRIBUTES = %i[term].freeze

      attr_accessor :term

      def initialize
        yield self if block_given?
      end

      def index
        { index: { _index: ::Disease::Elasticsearch.index_name, _type: '_doc' } }
      end

      def to_h
        ATTRIBUTES.map { |x| [x, send(x)] }.to_h.compact
      end

      def to_json(*args)
        to_h.to_json(*args)
      end
    end
  end
end
