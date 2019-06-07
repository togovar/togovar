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

      attr_accessor :tgv_id

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
      attr_accessor :population

      def initialize(data = nil)
        if data.is_a?(CSV::Row)
          @tgv_id = data['tgv_id']
          @source = data['source']
          @num_alleles = data['num_alleles']&.to_i
          @num_ref_alleles = data['num_ref_alleles']&.to_i
          @num_alt_alleles = data['num_alt_alleles']&.to_i
          @num_genotype_ref_homo = data['num_genotype_ref_homo']&.to_i
          @num_genotype_alt_homo = data['num_genotype_alt_homo']&.to_i
          @num_genotype_hetero = data['num_genotype_hetero']&.to_i
          @frequency = data['frequency']&.to_f
          @filter = data['filter']&.split(/[,;]/)
          @quality = data['quality']&.to_f
          @vcf = { chromosome: data['chr']&.to_s,
                   position: data['pos']&.to_i,
                   reference: data['ref'],
                   alternative: data['alt'] }.compact
          @population = data.select { |k, _| k.match?(/^[A-Z_]+$/) }.to_h
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

      def to_rdf
        data = RDFDataset.new

        base_url = Rails.configuration.virtuoso['base_url'] || raise('Resource base URI is not set.')
        s = RDF::URI.new("#{base_url}/variant/#{tgv_id}")

        data << [s, Vocabulary::TGVO.has_frequency, (f = RDF::Node.new)]

        data << [f, RDF.type, Vocabulary::TGVO.Frequency]
        data << [f, RDF::Vocab::DC.source, source_for(source)]
        data << [f, RDF::Vocab::RDFS.label, label_for(source)]

        data << [f, Vocabulary::TGVO.num_alleles, num_alleles.to_i] if num_alleles
        data << [f, Vocabulary::TGVO.num_ref_alleles, num_ref_alleles.to_i] if num_ref_alleles
        data << [f, Vocabulary::TGVO.num_alt_alleles, num_alt_alleles.to_i] if num_alt_alleles

        data << [f, Vocabulary::TGVO.num_genotype_ref_homo, num_genotype_ref_homo.to_i] if num_genotype_ref_homo
        data << [f, Vocabulary::TGVO.num_genotype_alt_homo, num_genotype_alt_homo.to_i] if num_genotype_alt_homo
        data << [f, Vocabulary::TGVO.num_genotype_hetero, num_genotype_hetero.to_i] if num_genotype_hetero

        data << [f, Vocabulary::TGVO.frequency, frequency.to_f] if frequency
        Array(filter).each do |x|
          data << [f, Vocabulary::TGVO.filter, x]
        end
        data << [f, Vocabulary::TGVO.quality, quality.to_f] if quality

        if population.present?
          %w[AN_AFR AN_AMR AN_EAS AN_FIN AN_NFE AN_SAS AN_OTH].each do |key|
            next unless population[key].present?

            data << [f, Vocabulary::SIO['SIO_000028'], (p = RDF::Node.new)] # has_part
            data << [p, RDF::Vocab::RDFS.label, label_for(key)]
            data << [p, Vocabulary::TGVO.num_alleles, (count = population[key].to_i)]
            data << [p, Vocabulary::TGVO.num_ref_alleles, population[key.sub('AN', 'REF')].to_i]
            data << [p, Vocabulary::TGVO.num_alt_alleles, (alt = population[key.sub('AN', 'ALT')].to_i)]
            data << [p, Vocabulary::TGVO.frequency, count.zero? ? 0 : alt / count.to_f]
          end
        end

        data
      end

      private

      def source_for(source)
        case source
        when 'tommo'
          Vocabulary::TGVO.ToMMo
        when 'hgvd'
          Vocabulary::TGVO.HGVD
        when 'jga_snp'
          Vocabulary::TGVO['JGA-SNP']
        when 'jga_ngs'
          Vocabulary::TGVO['JGA-NGS']
        when 'exac'
          Vocabulary::TGVO.ExAC
        else
          Vocabulary::TGVO[source]
        end
      end

      def label_for(source)
        case source
        when 'tommo'
          '3.5k JPN'
        when 'hgvd'
          'HGVD'
        when 'jga_snp'
          'JGA-SNP'
        when 'jga_ngs'
          'JGA-NGS'
        when 'exac'
          'ExAC'
        when 'AN_AFR'
          'African/African American'
        when 'AN_AMR'
          'American'
        when 'AN_EAS'
          'East Asian'
        when 'AN_FIN'
          'Finnish'
        when 'AN_NFE'
          'Non-Finnish European'
        when 'AN_SAS'
          'South Asian'
        when 'AN_OTH'
          'Other'
        else
          source
        end
      end
    end
  end
end
