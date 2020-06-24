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
      Variation.set_refresh_interval(-1) unless options[:batch]

      BioVcf::VcfRecord.include(TogoVar::Ndjson::Formatter::VEP)

      record_number = 0
      buffer = []

      TogoVar::VCF.new(filename).each do |record|
        record_number = record.record_number

        if record.alt.size > 1
          warn 'Skipped multi allelic variation: '\
               "id = #{record.id}, pos = #{record.pos}, ref = #{record.ref}, alt = #{record.alt}"
        else
          buffer << record.update_action
          buffer << record.data.merge(doc_as_upsert: true)
        end

        next unless (record.record_number % 10_000).zero?

        retry_count = 0
        response = begin
                     Variation.es.bulk(body: buffer)
                   rescue Faraday::Error => e
                     raise e if (retry_count += 1) > 5
                     warn "#{record.record_number} - retry after #{2**retry_count} seconds"
                     sleep 2**retry_count
                     retry
                   end
        warn "#{record.record_number} - took: #{response['took']}, errors: #{response['errors'].inspect}"

        buffer = []
      rescue StandardError => e
        headers = record&.header&.lines&.size
        records = record&.record_number
        fields = record&.fields
        warn "Line: #{headers + records}" if headers && records
        warn "Fields: #{fields.to_s}" if fields
        raise e
      end

      if buffer.present?
        response = Variation.es.bulk(body: buffer)
        warn "#{record_number} - took: #{response['took']}, errors: #{response['errors'].inspect}"
      end
    ensure
      Variation.set_refresh_interval unless options[:batch]
    end
  end
end
