require_relative '../../config/application'
require 'csv'
require 'thor'
require 'togo_var'

Rails.application.initialize! unless Rails.application.initialized?

module Tasks
  class Gene < Thor
    namespace :gene

    desc 'generate_index', 'Generate gene index (wget ftp://ftp.ebi.ac.uk/pub/databases/genenames/new/tsv/hgnc_complete_set.txt)'

    def generate_index(filename, output_prefix)
      CSV::Row.include(TogoVar::Ndjson::Formatter::Gene)

      options = {
        headers: true,
        header_converters: :symbol,
        col_sep: filename.match?(/\.csv(\.gz)?$/) ? ',' : "\t"
      }

      TogoVar::Ndjson::Writer.open(output_prefix) do |writer|
        CSV.foreach(filename, **options) do |row|
          writer.write(*row.bulk_requests)
        end
      end
    end
  end
end
