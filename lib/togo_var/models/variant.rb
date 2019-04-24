require 'active_support'
require 'active_support/core_ext'
require 'json'

require 'togo_var/models/transcript'

module TogoVar
  module Models
    class Variant

      SO_VARIANT_TYPE = Hash.new { |hash, key| hash[key] = SequenceOntology.find_by_label(key) }

      class << self
        # @param [Array<VEP::Annotation>] data an array of VEP::Annotaion, tgv_id of all elements must be same
        def compose(*data)
          unless (u = data.map(&:uploaded_variation).uniq).length == 1
            raise(ArgumentError, "different variants in an array (#{u.join(', ')})")
          end

          new(data.first) do |v|
            trs = data.map { |x| Transcript.new(x) }
            v.transcripts = trs.map(&:to_h)
            v.most_severe_consequence = Transcript.most_severe_consequence(*trs)
          end
        end
      end

      CHROMOSOME_CODE = {
        'X' => 23,
        'Y' => 24,
        'MT' => 25
      }.merge((1..22).map { |x| [x.to_s, x] }.to_h).freeze

      ATTRIBUTES = %i[tgv_id variant_type chromosome chromosome_sort start stop
                      reference alternative vcf existing_variations hgvs_g
                      most_severe_consequence transcripts condition frequency].freeze

      attr_accessor :tgv_id
      attr_accessor :variant_type
      attr_accessor :chromosome
      attr_accessor :chromosome_sort
      attr_accessor :start
      attr_accessor :stop
      attr_accessor :reference
      attr_accessor :alternative
      attr_accessor :vcf
      attr_accessor :existing_variations
      attr_accessor :hgvs_g
      attr_accessor :most_severe_consequence
      attr_accessor :transcripts
      attr_accessor :condition
      attr_accessor :frequency

      def initialize(data = nil)
        if data.is_a?(TogoVar::IO::VEP::Annotation)
          @tgv_id = data.uploaded_variation.sub(/^tgv/, '').to_i
          @variant_type = SO_VARIANT_TYPE[data.variant_class]&.id
          @chromosome = data.location.split(':')[0].presence
          @chromosome_sort = CHROMOSOME_CODE[@chromosome]
          @start, @stop = data.location.split(':')[1].split('-').map(&:to_i).map(&:presence)
          @stop ||= @start
          @reference = data.ref.presence
          @alternative = data.allele.presence
          @vcf = { chromosome: data.chr_vcf.presence,
                   position: data.pos_vcf.presence&.to_i,
                   reference: data.ref_vcf.presence,
                   alternative: data.alt_vcf.presence }.compact
          @hgvs_g = data.hgvsg.presence

          if (ev = data.existing_variation).presence
            @existing_variations = ev.split(',').select { |z| z.match?(/^rs/) }.presence
          end
        end

        yield self if block_given?
      end

      def _id
        return if @vcf.nil?

        ref = @vcf[:reference] || '-'
        alt = @vcf[:alternative] || '-'

        md5 = Digest::MD5.hexdigest("#{ref}/#{alt}")

        "#{format('%02d', @vcf[:chromosome])}:#{format('%010d', @vcf[:position])}:#{md5}"
      end

      def index
        { index: { _index: Variant::Elasticsearch.index_name, _type: '_doc', _id: _id } }
      end

      def to_h
        ATTRIBUTES.map { |x| [x, send(x)] }.to_h.compact
      end

      def to_json
        to_h.to_json
      end
    end
  end
end
