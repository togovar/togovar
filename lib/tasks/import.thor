require_relative '../../config/application'
require 'togo_var'
require 'thor'

Rails.application.initialize! unless Rails.application.initialized?

module Tasks
  class Import < Thor
    namespace :import

    desc 'vep', 'Import VEP annotations into elasticsearch'

    def vep(path)
      array_of_action_data = []

      Variation.set_refresh_interval(-1)

      TogoVar::IO::VEP::VCF.new(path).each do |record, i|
        array_of_action_data << TogoVar::IO::VEP::VCF.update_action(record)
        array_of_action_data << TogoVar::IO::VEP::VCF.data(record).merge(doc_as_upsert: true)

        next unless (i % 10_000).zero?

        response = Variation.es.bulk(body: array_of_action_data)
        puts "#{i} - took: #{response['took']}, errors: #{response['errors'].inspect}}"

        array_of_action_data = []
      rescue StandardError => e
        pp record
        raise e
      end

      if array_of_action_data.present?
        response = Variation.es.bulk(body: array_of_action_data)
        puts "Remnants - took: #{response['took']}, errors: #{response['errors'].inspect}, items: #{response['items']&.size}"
      end

      Variation.set_refresh_interval
    end
  end
end
