require 'thor'

module TogoVar
  class Convert < Thor
    include Thor::Actions

    namespace 'togovar convert'

    desc 'vep2es <VEP_FILE>', 'convert VEP annotation to Elasticsearch index'
    option :output, aliases: '-o', type: :string, default: 'out', desc: 'path to output directory'
    option :prefix, aliases: '-p', type: :string, desc: 'file name prefix'

    def vep2es(path)
      output = File.expand_path(options[:output]).tap(&assert_directory_presence)
      vep = File.expand_path(path).tap(&assert_file_presence)

      require_relative '../../config/environment'
      require 'togo_var'

      inside(output) do
        i = 0
        prefix = options[:prefix].present? ? options[:prefix] : "variants_#{date_time_for_file_name}_"
        ::TogoVar::IO::NDJSON.open(prefix, file_torate: true, start: 1) do |f|
          ::TogoVar::IO::VEP.foreach(vep) do |v|
            variant = ::TogoVar::Models::Variant.compose(*v)
            f.write [variant.index, variant]

            STDERR.print "\r #{i}" if ((i += 1) % 10_000).zero?
          end
        end

        STDERR.puts "\r #{i}"
      end
    end

    desc 'vep2rdf <VEP_FILE>', 'convert VEP annotation to RDF'
    option :output, aliases: '-o', type: :string, default: 'out', desc: 'path to output directory'
    option :prefix, aliases: '-p', type: :string, desc: 'file name prefix'

    def vep2rdf(path)
      output = File.expand_path(options[:output]).tap(&assert_directory_presence)
      vep = File.expand_path(path).tap(&assert_file_presence)

      require_relative '../../config/environment'
      require 'rdf'
      require 'togo_var'
      require 'zlib'

      inside(output) do
        count = 0

        prefix = options[:prefix].present? ? options[:prefix] : "variants_#{date_time_for_file_name}_"

        Zlib::GzipWriter.open("#{prefix}.nt.gz") do |gz|
          RDF::Writer.for(:ntriples).new(gz) do |writer|
            ::TogoVar::IO::VEP.foreach(vep) do |v|
              writer << ::TogoVar::Models::Variant.compose(*v)
              STDERR.print "\r #{count}" if ((count += 1) % 1000).zero?
            end
          end
        end

        STDERR.puts "\r #{count}"
      end
    end

    desc 'frequency2es <FREQ_FILE>', 'convert frequency data to Elasticsearch index'
    option :output, aliases: '-o', type: :string, default: 'out', desc: 'path to output directory'
    option :prefix, aliases: '-p', type: :string, desc: 'file name prefix'

    def frequency2es(file)
      output = File.expand_path(options[:output]).tap(&assert_directory_presence)
      path = File.expand_path(file).tap(&assert_file_presence)

      require_relative '../../config/environment'
      require 'togo_var'
      require 'csv'

      inside(output) do
        i = 0
        prefix = options[:prefix].present? ? options[:prefix] : "frequencies_#{date_time_for_file_name}_"

        ::TogoVar::IO::NDJSON.open(prefix, file_torate: true, start: 1) do |f|
          (path.match?(/\.gz$/) ? Zlib::GzipReader : File).open(path) do |input|
            CSV.new(input, headers: true, col_sep: "\t").each do |row|
              freq = ::TogoVar::Models::Frequency.new(row)
              f.write [freq.update, freq]

              STDERR.print "\r #{i}" if ((i += 1) % 10_000).zero?
            end
          end
        end

        STDERR.puts "\r #{i}"
      end
    end

    desc 'frequency2rdf <VEP_FILE>', 'convert frequency data to RDF'
    option :output, aliases: '-o', type: :string, default: 'out', desc: 'path to output directory'
    option :prefix, aliases: '-p', type: :string, desc: 'file name prefix'

    def frequency2rdf(file)
      output = File.expand_path(options[:output]).tap(&assert_directory_presence)
      path = File.expand_path(file).tap(&assert_file_presence)

      require_relative '../../config/environment'
      require 'rdf'
      require 'togo_var'
      require 'zlib'

      inside(output) do
        count = 0

        prefix = options[:prefix].present? ? options[:prefix] : "variant_conditions_#{date_time_for_file_name}_"

        Zlib::GzipWriter.open("#{prefix}.nt.gz") do |gz|
          RDF::Writer.for(:ntriples).new(gz) do |writer|
            (path.match?(/\.gz$/) ? Zlib::GzipReader : File).open(path) do |input|
              CSV.new(input, headers: true, col_sep: "\t").each do |row|
                writer << Models::Frequency.new(row)

                STDERR.print "\r #{count}" if ((count += 1) % 10_000).zero?
              end
            end
          end
        end

        STDERR.puts "\r #{count}"
      end
    end

    desc 'condition2es <VCF_FILE>', 'convert ClinVar VCF to Elasticsearch index'
    option :output, aliases: '-o', type: :string, default: 'out', desc: 'path to output directory'
    option :prefix, aliases: '-p', type: :string, desc: 'file name prefix'

    def condition2es(file)
      output = File.expand_path(options[:output]).tap(&assert_directory_presence)
      path = File.expand_path(file).tap(&assert_file_presence)

      require_relative '../../config/environment'
      require 'togo_var'

      chromosomes = ('1'..'22').to_a.concat(%w[X Y MT])

      inside(output) do
        prefix = options[:prefix].present? ? options[:prefix] : "conditions_#{date_time_for_file_name}_"
        i = 0

        ::TogoVar::IO::NDJSON.open(prefix, file_torate: true, start: 1) do |f|
          ::TogoVar::IO::VCF.open(path) do |vcf|
            vcf.each_slice(300) do |slice|
              slice = slice.select { |x| chromosomes.include?(x.chrom) }

              results = Models::Condition.find_conditions(*slice.map(&:id))

              slice.each do |row|
                conditions = results[row.id.to_i]&.map do |r|
                  Models::Condition.new(row) do |c|
                    c.vcv = r[:vcv]
                    c.rcv = r[:rcv]
                    c.medgen = r[:medgen]
                    c.condition = r[:condition]
                    c.interpretations = r[:interpretation]
                                          .split(/[\/,]/)
                                          .map { |x| x.strip.downcase.gsub(' ', '_') }
                  end
                end

                if conditions
                  f.write [conditions.first.update, Models::Condition.upsert_action(*conditions)]
                end
                STDERR.print "\r #{i}" if ((i += 1) % 1_000).zero?
              end
            end
          end
        end

        STDERR.puts "\r #{i}"
      end
    end

    desc 'condition2rdf <VEP_FILE>', 'convert ClinVar VCF to RDF'
    option :output, aliases: '-o', type: :string, default: 'out', desc: 'path to output directory'
    option :prefix, aliases: '-p', type: :string, desc: 'file name prefix'

    def condition2rdf(file)
      output = File.expand_path(options[:output]).tap(&assert_directory_presence)
      path = File.expand_path(file).tap(&assert_file_presence)

      require_relative '../../config/environment'
      require 'rdf'
      require 'togo_var'
      require 'zlib'

      base_url = Rails.configuration.virtuoso['base_url'] || raise('Resource base URI is not set.')

      chromosomes = ('1'..'22').to_a.concat(%w[X Y MT])

      inside(output) do
        count = 0

        prefix = options[:prefix].present? ? options[:prefix] : "variant_conditions_#{date_time_for_file_name}_"

        Zlib::GzipWriter.open("#{prefix}.nt.gz") do |gz|
          RDF::Writer.for(:ntriples).new(gz) do |writer|
            IO::VCF.open(path) do |vcf|
              vcf.each_slice(300) do |slice|
                slice = slice.select { |x| chromosomes.include?(x.chrom) }

                Models::Variant.find_by_vcf(*slice).each do |tgv, vcv|
                  writer << [RDF::URI.new("#{base_url}/variant/#{tgv}"), Vocabulary::TGVO.has_interpreted_condition, RDF::URI("http://identifiers.org/clinvar:#{vcv}")]
                end
                STDERR.print "\r #{count += slice.size}"
              end
            end
          end
        end

        STDERR.puts "\r #{count}"
      end
    end

    desc 'gene2es <VEP_FILE>', 'Convert gene symbols to Elasticsearch index'
    option :output, aliases: '-o', type: :string, default: 'out', desc: 'path to output directory'
    option :prefix, aliases: '-p', type: :string, desc: 'file name prefix'

    def gene2es(file)
      output = File.expand_path(options[:output]).tap(&assert_directory_presence)
      path = File.expand_path(file).tap(&assert_file_presence)

      require_relative '../../config/environment'
      require 'togo_var'

      inside(output) do
        prefix = options[:prefix].present? ? options[:prefix] : "gene_symbols_#{date_time_for_file_name}_"

        i = 0
        hash = {}

        STDERR.puts 'Collecting distinct symbols...'

        ::TogoVar::IO::VEP.foreach(path) do |v|
          v.each do |tr|
            next unless tr.symbol.present?

            hash[tr.symbol] ||= ::TogoVar::Models::GeneSymbol.new do |x|
              x.gene_id = tr.gene
              x.symbol = tr.symbol
              x.symbol_source = tr.symbol_source
              x.hgnc_id = tr.hgnc_id.to_i if tr.hgnc_id.present?
            end
          end
          STDERR.print "\r #{hash.size} (read: #{i} lines)" if ((i += 1) % 10_000).zero?
        end
        STDERR.puts "\r #{hash.size} (read: #{i} lines)"

        STDERR.puts 'Collecting aliases...'

        symbols = hash.values

        symbols.concat(::TogoVar::Models::GeneSymbol.fetch_alias(symbols) do |progress|
          STDERR.print "\r #{progress}/#{symbols.size}"
        end)
        STDERR.print "\r #{symbols.size}/#{symbols.size}"

        ::TogoVar::IO::NDJSON.open(prefix, file_torate: true, start: 1) do |f|
          symbols.each do |x|
            f.write [x.index, x]
          end
        end
      end
    end

    desc 'disease2es', 'Convert disease terms to Elasticsearch index'
    option :output, aliases: '-o', type: :string, default: 'out', desc: 'path to output directory'
    option :prefix, aliases: '-p', type: :string, desc: 'file name prefix'

    def disease2es
      output = File.expand_path(options[:output]).tap(&assert_directory_presence)

      require_relative '../../config/environment'
      require 'togo_var'

      inside(output) do
        prefix = options[:prefix].present? ? options[:prefix] : "diseases_#{date_time_for_file_name}_"
        ::TogoVar::IO::NDJSON.open(prefix, file_torate: true, start: 1) do |f|
          ::TogoVar::Models::Disease.distinct.each do |x|
            f.write [x.index, x]
          end
        end
      end
    end

    def self.banner(task, namespace = false, subcommand = true)
      super
    end

    private

    def assert_file_presence
      ->(f) { raise("File not found: #{f}") unless File.exist?(f) }
    end

    def assert_file_absence
      ->(f) { raise("File already exist: #{f}") if File.exist?(f) }
    end

    def assert_directory_presence
      ->(f) { raise("Directory not found: #{f}") unless Dir.exist?(f) }
    end

    def date_time_for_file_name
      require 'date'
      DateTime.now.strftime('%Y%m%dT%H%M')
    end
  end
end
