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
        ::TogoVar::IO::NDJSON.open(prefix: prefix) do |f|
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

        ::TogoVar::IO::VEP.open(vep).each_slice(100_000).with_index(1) do |slice, i|
          Zlib::GzipWriter.open("#{prefix}#{i}.nt.gz") do |gz|
            RDF::Writer.for(:ntriples).new(gz) do |writer|
              slice.each do |v|
                writer << ::TogoVar::Models::Variant.compose(*v)
                STDERR.print "\r #{count}" if ((count += 1) % 1000).zero?
              end
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

        ::TogoVar::IO::NDJSON.open(prefix: prefix) do |f|
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

    desc 'condition2es <VCF_FILE>', 'convert ClinVar VCF to Elasticsearch index'
    option :output, aliases: '-o', type: :string, default: 'out', desc: 'path to output directory'
    option :prefix, aliases: '-p', type: :string, desc: 'file name prefix'

    def condition2es(file)
      output = File.expand_path(options[:output]).tap(&assert_directory_presence)
      path = File.expand_path(file).tap(&assert_file_presence)

      require_relative '../../config/environment'
      require 'togo_var'

      config = Rails.configuration.endpoint
      endpoint = SPARQL::Client.new(config['url'])

      inside(output) do
        prefix = options[:prefix].present? ? options[:prefix] : "conditions_#{date_time_for_file_name}_"
        i = 0

        ::TogoVar::IO::NDJSON.open(prefix: prefix) do |f|
          ::TogoVar::IO::VCF.open(path) do |vcf|
            vcf.each_slice(300) do |slice|
              query = format(<<~SPARQL, slice.map { |x| "vcv:#{x.id}" }.join(' '))
                DEFINE sql:select-option "order"
                PREFIX cvo: <http://purl.jp/bio/10/clinvar/>
                PREFIX vcv: <http://identifiers.org/clinvar:>

                SELECT DISTINCT ?vcv ?rcv ?condition ?interpretation ?medgen
                FROM <http://togovar.biosciencedbc.jp/graph/clinvar>
                WHERE {
                  VALUES ?_vcv { %s }
                  ?_vcv cvo:interpreted_record/cvo:rcv_list/cvo:rcv_accession ?_rcv ;
                    cvo:accession ?vcv .
                  ?_rcv cvo:interpretation ?interpretation ;
                    cvo:accession ?rcv ;
                    cvo:interpreted_condition/cvo:type_rcv_interpreted_condition ?condition .
                  OPTIONAL {
                    ?_rcv cvo:interpreted_condition/cvo:db ?db .
                    ?_rcv cvo:interpreted_condition/cvo:id ?medgen .
                    FILTER( ?db IN ("MedGen") )
                  }
                }
              SPARQL

              results = endpoint.query(query)
                          .map { |x| x.bindings.map { |k, v| [k, v.value] }.to_h }
                          .group_by { |x| x[:vcv] }
                          .map { |k, v| [k.sub(/^VCV/, '').to_i, v] }.to_h

              slice.each do |row|
                conditions = results[row.id.to_i]&.map do |r|
                  Models::Condition.new(row) do |c|
                    c.vcv = r[:vcv]
                    c.rcv = r[:rcv]
                    c.medgen = r[:medgen]
                    c.condition = r[:condition]
                    c.interpretations = r[:interpretation].split(/[\/,]/).map(&:strip).map(&:downcase)
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

        ::TogoVar::IO::NDJSON.open(prefix: prefix) do |f|
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
        ::TogoVar::IO::NDJSON.open(prefix: prefix) do |f|
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
