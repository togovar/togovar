require_relative '../../config/application'
require 'togo_var'
require 'thor'

Rails.application.initialize! unless Rails.application.initialized?

module Tasks
  class Import < Thor
    namespace :import

    desc 'vep', 'Import VEP annotations (VCF) into elasticsearch'

    def vep(filename)
      Variation.set_refresh_interval(-1)

      BioVcf::VcfRecord.include(TogoVar::Ndjson::Formatter::VEP)

      buffer = []

      TogoVar::VCF.new(filename).each do |record|
        if record.alt.size > 1
          warn 'Skipped multi allelic variation: '\
                   "id = #{record.id}, pos = #{record.pos}, ref = #{record.ref}, alt = #{record.alt}"
        else
          buffer << record.update_action
          buffer << record.data.merge(doc_as_upsert: true)
        end

        next unless (record.record_number % 10_000).zero?

        response = Variation.es.bulk(body: array_of_action_data)
        warn "#{record.record_number} - took: #{response['took']}, errors: #{response['errors'].inspect}}"

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
        response = Variation.es.bulk(body: array_of_action_data)
        warn "Remnants - took: #{response['took']}, errors: #{response['errors'].inspect}}"
      end
    ensure
      Variation.set_refresh_interval
    end
  end
end
