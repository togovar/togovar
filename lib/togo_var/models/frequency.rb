require 'active_support'
require 'active_support/core_ext'
require 'csv'
require 'json'

module TogoVar
  module Models
    class Frequency

      ATTRIBUTES = %i[source num_alleles num_ref_alleles num_alt_alleles
                      num_genotype_ref_homo num_genotype_alt_homo
                      num_genotype_hetero frequency filter quality].freeze

      attr_accessor :source
      attr_accessor :num_alleles
      attr_accessor :num_ref_alleles
      attr_accessor :num_alt_alleles
      attr_accessor :num_genotype_ref_homo
      attr_accessor :num_genotype_alt_homo
      attr_accessor :num_genotype_hetero
      attr_accessor :frequency
      attr_accessor :filter
      attr_accessor :quality

      attr_accessor :vcf

      def initialize(data = nil)
        if data.is_a?(CSV::Row)
          @source = data['source']
          @num_alleles = data['num_alleles']&.to_i
          @num_ref_alleles = data['num_ref_alleles']&.to_i
          @num_alt_alleles = data['num_alt_alleles']&.to_i
          @num_genotype_ref_homo = data['num_genotype_ref_homo']&.to_i
          @num_genotype_alt_homo = data['num_genotype_alt_homo']&.to_i
          @num_genotype_hetero = data['num_genotype_hetero']&.to_i
          @frequency = data['frequency']&.to_f
          @filter = data['filter']&.split(/[,;]/)
          @quality = data['quality']
          @vcf = { chromosome: data['chr']&.to_s,
                   position: data['pos']&.to_i,
                   reference: data['ref'],
                   alternative: data['alt'] }.compact
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
        {
          script: {
            source: 'if (ctx._source.frequencies == null) { ctx._source.frequencies = [] } ctx._source.frequencies.add(params.frequency)',
            lang: 'painless',
            params: {
              frequency: ATTRIBUTES.map { |x| [x, send(x)] }.to_h.compact
            }
          }
        }
      end

      def to_json(*args)
        to_h.to_json(*args)
      end
    end
  end
end
