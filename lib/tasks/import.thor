require_relative '../../config/application'
require 'csv'
require 'thor'
require 'togo_var'

Rails.application.initialize! unless Rails.application.initialized?

module Tasks
  class Import < Thor
    namespace :import

    desc 'vep', 'Import VEP annotations (VCF) into elasticsearch'
    option :batch, aliases: '-b', type: :boolean, desc: 'do not change refresh interval'

    def vep(filename)
      import_vcf(filename, TogoVar::Ndjson::Formatter::VEP, 10_000, Variation)
    end

    desc 'clinvar', 'Import ClinVar VCF into elasticsearch'
    option :batch, aliases: '-b', type: :boolean, desc: 'do not change refresh interval'

    def clinvar(filename)
      import_vcf(filename, TogoVar::Ndjson::Formatter::ClinVar, 1_000, Variation)
    end

    desc 'frequency', 'Import VCF that consists of allele count, allele number and allele frequency into elasticsearch'
    option :source, banner: 'KEY', aliases: '-s', type: :string, required: true,
           enum: %w[exac gem_j_wga gnomad hgvd jga_ngs jga_snp tommo_4.7kjpn],
           desc: 'Set dataset name to be assigned to dc:source'
    option :batch, aliases: '-b', type: :boolean, desc: 'do not change refresh interval'

    def frequency(filename)
      import_vcf(filename, TogoVar::Ndjson::Formatter::Frequency, 1_000, Variation)
    end

    desc 'gene', 'Import HGNC gene complete set (TSV) into elasticsearch'

    def gene(filename)
      import_csv(filename, TogoVar::Ndjson::Formatter::Gene, 10_000, Gene)
    end

    desc 'disease', 'Import MedGen names (CSV) into elasticsearch'

    def disease(filename)
      import_csv(filename, TogoVar::Ndjson::Formatter::Disease, 10_000, Disease)
    end

    private

    def disable_logging
      return unless defined?(Rails) &&
        Rails.configuration.respond_to?(:elasticsearch) &&
        (config = Rails.configuration.elasticsearch).present?

      ::Elasticsearch::Model.client = ::Elasticsearch::Client.new(config.merge(log: false))
    end

    def import_vcf(filename, formatter, bulk_size, *indices)
      disable_logging

      BioVcf::VcfRecord.include(formatter)

      record_number = 0
      buffer = []

      indices.map { |x| x.set_refresh_interval(-1) } unless options[:batch]

      TogoVar::VCF.new(filename, source: options[:source]).each do |record|
        record_number = record.record_number

        if record.alt.size > 1
          warn 'Skipped multi allelic variation: '\
               "id = #{record.id}, pos = #{record.pos}, ref = #{record.ref}, alt = #{record.alt}"
        else
          buffer << record.update_action
          buffer << record.data
        end

        next unless (record_number % bulk_size).zero?

        bulk_request(buffer, record_number)
        buffer = []
      rescue StandardError => e
        headers = record&.header&.lines&.size || 0
        fields = record&.fields
        warn "Line: #{headers + record_number}"
        warn "Fields: #{fields.to_s}" if fields
        raise e
      end

      bulk_request(buffer, record_number) if buffer.present?
    ensure
      indices.map { |x| x.set_refresh_interval } unless options[:batch]
    end

    def import_csv(filename, formatter, bulk_size, *indices)
      disable_logging

      CSV::Row.include(formatter)

      record_number = 0
      buffer = []

      indices.map { |x| x.set_refresh_interval(-1) } unless options[:batch]

      options = {
        headers: true,
        header_converters: :symbol,
        col_sep: filename.match?(/\.csv(\.gz)?$/) ? ',' : "\t"
      }

      csv = if filename.match?(/\.gz$/)
              CSV.new(Zlib::GzipReader.open(filename), **options)
            else
              CSV.new(File.open(filename), **options)
            end

      csv.each do |row|
        record_number = csv.lineno - 1

        buffer << row.update_action
        buffer << row.data

        next unless (record_number % bulk_size).zero?

        bulk_request(buffer, record_number)
        buffer = []
      rescue StandardError => e
        warn "Line: #{csv.lineno}"
        warn "Fields: #{row&.inspect}"
        raise e
      end

      bulk_request(buffer, record_number) if buffer.present?
    ensure
      indices.map { |x| x.set_refresh_interval } unless options[:batch]
      csv.close
    end

    def bulk_request(data, record_number = nil)
      retry_count = 0

      response = begin
                   ::Elasticsearch::Model.client.bulk(body: data)
                 rescue Faraday::Error => e
                   raise e if (retry_count += 1) > 5
                   warn "#{record_number} - #{e.message} / retry after #{2 ** retry_count} seconds"
                   sleep 2 ** retry_count
                   retry
                 end

      warn "#{record_number} - took: #{response['took']}, errors: #{response['errors'].inspect}"
      if response['errors'] && (items = response['items']).present?
        warn items.find { |x| x.dig('update', 'error') }&.dig('update', 'error')
      end

      response
    end
  end
end
