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
        prefix = options[:prefix].present? ? options[:prefix] : "#{File.basename(vep, File.extname(vep))}_"
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
        prefix = options[:prefix].present? ? options[:prefix] : "#{File.basename(path, File.extname(path))}_"

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
        i = 0
        prefix = options[:prefix].present? ? options[:prefix] : "#{File.basename(path, File.extname(path))}_"

        ::TogoVar::IO::NDJSON.open(prefix: prefix) do |f|
          ::TogoVar::IO::VCF.open(path) do |vcf|
            vcf.each_slice(300) do |slice|
              query = format(<<~SPARQL, slice.map { |x| "vcv:#{x.id}" }.join(' '))
                DEFINE sql:select-option "order"

                PREFIX cvo: <http://purl.jp/bio/10/clinvar/>
                PREFIX faldo: <http://biohackathon.org/resource/faldo#>
                PREFIX m2r: <http://med2rdf.org/ontology/med2rdf#>
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
                STDERR.print "\r #{i}" if ((i += 1) % 10_000).zero?
              end
            end
          end
        end

        STDERR.puts "\r #{i}"
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
  end
end
