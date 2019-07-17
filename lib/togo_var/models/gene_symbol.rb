require 'active_support'
require 'active_support/core_ext'
require 'json'

module TogoVar
  module Models
    class GeneSymbol

      class << self
        def fetch_alias(gene_symbols)
          buf = []

          count = 0
          gene_symbols.each_slice(300) do |slice|
            result = endpoint.query <<~SPARQL
              PREFIX hgnc: <http://identifiers.org/hgnc/HGNC:>
              PREFIX skos: <http://www.w3.org/2004/02/skos/core#>

              SELECT DISTINCT (replace(str(?id), "http://identifiers.org/hgnc/HGNC:", "") AS ?id) ?symbol ?synonym
              FROM <http://togovar.biosciencedbc.jp/graph/hgnc>
              WHERE {
                VALUES ?id { #{slice.map { |x| x.hgnc_id ? "hgnc:#{x.hgnc_id}" : nil }.compact.join(' ')} }
                ?id rdfs:label ?symbol .
                OPTIONAL { ?id skos:altLabel ?synonym . }
              }
            SPARQL

            result.bindings[:id].map { |x| x.value.to_i }
              .zip(result.bindings[:synonym].map(&:value))
              .group_by { |x| x[0] }
              .each do |k, v|
              parent = gene_symbols.find { |x| x.hgnc_id == k }

              buf.concat(v.map do |y|
                new do |z|
                  z.gene_id = parent.gene_id
                  z.symbol = y[1]
                  z.symbol_source = parent.symbol_source
                  z.alias_of = parent.symbol
                end
              end)
            end

            yield count += slice.size if block_given?
          end

          buf
        end

        private

        def endpoint
          @endpoint ||= SPARQL::Client.new(Rails.configuration.endpoint['sparql'])
        end
      end

      ATTRIBUTES = %i[gene_id symbol symbol_source alias_of].freeze

      attr_accessor :gene_id
      attr_accessor :symbol
      attr_accessor :symbol_source
      attr_accessor :hgnc_id
      attr_accessor :alias_of

      def initialize
        yield self if block_given?
      end

      def index
        { index: { _index: ::GeneSymbol::Elasticsearch.index_name, _type: '_doc' } }
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
