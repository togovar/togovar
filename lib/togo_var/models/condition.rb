require 'active_support'
require 'active_support/core_ext'
require 'csv'
require 'json'

module TogoVar
  module Models
    class Condition

      class << self
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
              chromosome: c.vcf[:chromosome],
              chromosome_sort: Variant::CHROMOSOME_CODE[c.vcf[:chromosome]],
              start: c.vcf[:position].to_i,
              stop: c.vcf[:position].to_i + c.vcf[:reference].length - 1,
              reference: c.vcf[:reference],
              alternative: c.vcf[:alternative],
              vcf: { chromosome: c.vcf[:chromosome],
                     position: c.vcf[:position].to_i,
                     reference: c.vcf[:reference],
                     alternative: c.vcf[:alternative] },
              conditions: conditions.map(&:to_h)
            }
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
        if data.is_a?(TogoVar::IO::VCF::Row)
          @vcf = { chromosome: data.chrom,
                   position: data.pos,
                   reference: data.ref,
                   alternative: data.alt }.compact
        end

        yield self if block_given?
      end

      def _id
        return if @vcf.nil?

        TogoVar::Models::Variant.new { |x| x.vcf = @vcf }._id
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
