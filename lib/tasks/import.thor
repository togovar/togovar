require_relative '../../config/application'
require 'togo_var'
require 'thor'

Rails.application.initialize! unless Rails.application.initialized?

module Tasks
  class Import < Thor
    namespace :import

    desc 'vep', 'Import VEP annotations (VCF) into elasticsearch'
    option :batch, aliases: '-b', type: :boolean, desc: 'do not change refresh interval'

    def vep(filename)
      import(filename, TogoVar::Ndjson::Formatter::VEP, 10_000, Variation)
    end

    desc 'clinvar', 'Import ClinVar VCF into elasticsearch'
    option :batch, aliases: '-b', type: :boolean, desc: 'do not change refresh interval'

    def clinvar(filename)
      import(filename, TogoVar::Ndjson::Formatter::ClinVar, 1_000, Variation)
    end

    desc 'frequency', 'Import VCF that consists of allele count, allele number and allele frequency into elasticsearch'
    option :source, banner: 'KEY', aliases: '-s', type: :string, required: true,
           enum: %w[exac gem_j_wga gnomad hgvd jga_ngs jga_snp tommo_4.7kjpn],
           desc: 'Set dataset name to be assigned to dc:source'
    option :batch, aliases: '-b', type: :boolean, desc: 'do not change refresh interval'

    def frequency(filename)
      import(filename, TogoVar::Ndjson::Formatter::Frequency, 1_000, Variation)
    end

    private

    def import(filename, formatter, bulk_size, *indices)
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
