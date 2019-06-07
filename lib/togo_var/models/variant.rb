require 'active_support'
require 'active_support/core_ext'
require 'json'
require 'rdf'

require 'togo_var/models/transcript'
require 'togo_var/rdf/vocabulary'

module TogoVar
  module Models
    class Variant
      include TogoVar::Vocabulary

      SO_VARIANT_TYPE = Hash.new { |hash, key| hash[key] = SequenceOntology.find_by_label(key) }

      class << self
        # @param [Array<VEP::Annotation>] data an array of VEP::Annotaion, tgv_id of all elements must be same
        def compose(*data)
          unless (u = data.map(&:uploaded_variation).uniq).length == 1
            raise(ArgumentError, "different variants in an array (#{u.join(', ')})")
          end

          new(data.first) do |v|
            trs = data.map { |x| Transcript.new(x) }
            v.transcripts = trs
            v.most_severe_consequence = Transcript.most_severe_consequence(*trs)
          end
        end

        # @param [TogoVar::IO::VCF::Row] rows
        def find_by_vcf(*rows)
          query = ::Elasticsearch::DSL::Search.search do
            query do
              bool do
                rows.each do |vcf|
                  should do
                    bool do
                      must { match 'vcf.chromosome': vcf.chrom }
                      must { match 'vcf.position': vcf.pos.to_i }
                      must { match 'vcf.reference': vcf.ref }
                      must { match 'vcf.alternative': vcf.alt }
                    end
                  end
                end
              end
            end
            size rows.size
          end

          results = ::Variant.search(query.to_hash).results.map { |x| x._source.to_hash.slice('tgv_id', 'vcf') }

          rows.map do |vcf|
            match = results.find do |x|
              x['vcf']['chromosome'] == vcf.chrom &&
                x['vcf']['position'].to_i == vcf.pos.to_i &&
                x['vcf']['reference'] == vcf.ref &&
                x['vcf']['alternative'] == vcf.alt
            end

            if match
              id = (v = match['tgv_id']) ? "tgv#{v}" : [vcf.chrom, vcf.pos, vcf.ref, vcf.alt].join('-')
              [id, vcf.id] # vcf.id = ClinVar VCV
            else
              nil
            end
          end.compact
        end
      end

      CHROMOSOME_CODE = {
        'X' => 23,
        'Y' => 24,
        'M' => 25,
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

        "#{format('%02d', CHROMOSOME_CODE[@vcf[:chromosome]])}:#{format('%010d', @vcf[:position])}:#{md5}"
      end

      def index
        { index: { _index: ::Variant::Elasticsearch.index_name, _type: '_doc', _id: _id } }
      end

      def to_h
        ATTRIBUTES.map { |x| [x, send(x)] }.to_h.compact
      end

      def to_json(*args)
        to_h.to_json(*args)
      end

      def to_rdf
        data = RDFDataset.new

        base_url = Rails.configuration.virtuoso['base_url'] || raise('Resource base URI is not set.')
        s = RDF::URI.new("#{base_url}/variant/tgv#{tgv_id}")

        data << [s, RDF.type, OBO[variant_type]]

        data << [s, RDF::Vocab::DC.identifier, "tgv#{tgv_id}"]
        data << [s, RDF::Vocab::RDFS.label, hgvs_g] if hgvs_g.present?

        data << [s, M2R['reference_allele'], reference || '']
        data << [s, M2R['alternative_allele'], alternative || '']

        # position
        region   = RDF::Node.new
        bn_begin = RDF::Node.new
        if start != stop
          bn_end = RDF::Node.new

          data << [region, RDF.type, FALDO.Region]
          data << [region, FALDO.begin, bn_begin]
          data << [region, FALDO.end, bn_end]

          data << [bn_end, RDF.type, FALDO.ExactPosition]
          data << [bn_end, FALDO.position, stop]
          data << [bn_end, FALDO.reference, HCO[chromosome] / '#GRCh37']
        end

        data << [bn_begin, RDF.type, FALDO.ExactPosition]
        data << [bn_begin, FALDO.position, start]
        data << [bn_begin, FALDO.reference, HCO[chromosome] / '#GRCh37']

        data << [s, FALDO.location, start == stop ? bn_begin : region]

        Array(existing_variations).each do |x|
          data << [s, RDF::Vocab::RDFS.seeAlso, RDF::URI.new("http://identifiers.org/dbsnp/#{x}")]
        end

        data << [s, TGVO.most_severe_consequence, OBO[most_severe_consequence]] if most_severe_consequence.present?

        transcripts.each do |t|
          data.concat(t.to_triples(s))
        end

        data
      end
    end

    class RDFDataset
      extend Forwardable
      include RDF::Enumerable

      def initialize
        super
        @array = []
      end

      def <<(data)
        @array << RDF::Statement(*data)
      end

      def concat(other)
        other.each { |o| self << o }
      end

      def_delegators :@array, :each
    end
  end
end
