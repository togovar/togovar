require 'active_support'
require 'active_support/core_ext'
require 'csv'
require 'json'

module TogoVar
  module Models
    class Condition

      class << self
        def find_conditions(*vcv)
          config = Rails.configuration.endpoint['togovar']
          endpoint = SPARQL::Client.new(config['url'])

          query = format(<<~SPARQL, vcv.map { |x| "vcv:#{x}" }.join(' '))
            DEFINE sql:select-option "order"
            PREFIX cvo: <http://purl.jp/bio/10/clinvar/>
            PREFIX vcv: <http://identifiers.org/clinvar:>

            SELECT DISTINCT ?vcv ?rcv ?condition ?interpretation ?medgen
            FROM <http://togovar.biosciencedbc.jp/graph/clinvar>
            WHERE {
              VALUES ?_vcv { %s }
              ?_vcv cvo:interpreted_record/cvo:rcv_list/cvo:rcv_accession ?_rcv ;
                cvo:accession ?vcv .
              ?_rcv cvo:interpretation ?interpretation ;
                cvo:accession ?rcv ;
                cvo:interpreted_condition/cvo:type_rcv_interpreted_condition ?condition .
              OPTIONAL {
                ?_rcv cvo:interpreted_condition/cvo:db ?db .
                ?_rcv cvo:interpreted_condition/cvo:id ?medgen .
                FILTER( ?db IN ("MedGen") )
              }
            }
          SPARQL

          endpoint.query(query)
            .map { |x| x.bindings.map { |k, v| [k, v.value] }.to_h }
            .group_by { |x| x[:vcv] }
            .map { |k, v| [k.sub(/^VCV/, '').to_i, v] }.to_h
        end

        def upsert_action(*conditions)
          c = conditions.first
          {
            script: {
              source: 'ctx._source.conditions = params.conditions',
              lang: 'painless',
              params: {
                conditions: conditions.map(&:to_h)
              }
            },
            upsert: {
              chromosome: c.vcf.chrom,
              chromosome_sort: Variant::CHROMOSOME_CODE[c.vcf.chrom],
              start: c.vcf.start,
              stop: c.vcf.stop,
              variant_type: c.vcf.variant_type_so,
              reference: c.vcf.ref_display,
              alternative: c.vcf.alt_display,
              vcf: { chromosome: c.vcf.chrom,
                     position: c.vcf.pos.to_i,
                     reference: c.vcf.ref,
                     alternative: c.vcf.alt }.compact,
              conditions: conditions.map(&:to_h)
            }.compact
          }
        end
      end

      ATTRIBUTES = %i[vcv rcv medgen condition interpretations].freeze

      attr_accessor :vcv
      attr_accessor :rcv
      attr_accessor :medgen
      attr_accessor :condition
      attr_accessor :interpretations

      attr_accessor :vcf

      def initialize(data = nil)
        @vcf = data if data.is_a?(TogoVar::IO::VCF::Row)

        yield self if block_given?
      end

      def _id
        return if @vcf.nil?

        TogoVar::Models::Variant.new do |x|
          x.vcf = { chromosome: @vcf.chrom,
                    position: @vcf.pos,
                    reference: @vcf.ref,
                    alternative: @vcf.alt }.compact
        end._id
      end

      def update
        {
          update: {
            _index: ::Variant::Elasticsearch.index_name,
            _type: '_doc',
            _id: _id,
            retry_on_conflict: 3
          }
        }
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
