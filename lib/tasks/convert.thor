require 'thor'

module TogoVar
  class Convert < Thor
    include Thor::Actions

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
