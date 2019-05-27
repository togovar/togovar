require 'rdf'
require 'thor'
require 'thor/group'

module TogoVar
  class Virtuoso < Thor
    include Thor::Actions

    namespace 'togovar virtuoso'

    desc 'load [name = clinvar|hgnc|so|...]', 'load RDF'

    def load(name)
      require_relative '../../config/environment'

      config = Rails.configuration.virtuoso

      case (key = name.downcase)
      when 'variant'
        path = File.join(config['load_dir'], 'virtuoso', key, 'latest')
        graph = RDF::URI.new(config['base_url']).join("/graph/#{key}")

        load_dir path, '*.ttl.gz', graph
      when 'condition'
        path = File.join(config['load_dir'], 'virtuoso', 'variant_condition', 'latest')
        graph = RDF::URI.new(config['base_url']).join("/graph/variant/condition#{key}")

        load_dir path, '*.ttl.gz', graph
      when /^frequency\.(.*)$/
        source = $1
        path = File.join(config['load_dir'], 'virtuoso', 'variant_frequency', source, 'latest')
        graph = RDF::URI.new(config['base_url']).join("/graph/variant/frequency/#{source}")

        load_dir path, '*.nt.gz', graph
      when 'clinvar', 'hgnc'
        path = File.join(config['load_dir'], 'virtuoso', key, 'latest')
        graph = RDF::URI.new(config['base_url']).join("/graph/#{key}")

        load_dir path, '*.ttl.gz', graph
      when 'so'
        path = File.join(config['load_dir'], 'virtuoso', key, 'latest')
        graph = RDF::URI.new(config['base_url']).join("/graph/#{key}")

        load_dir path, '*.owl', graph
      when 'ensembl37'
        path = File.join(config['load_dir'], 'virtuoso', 'ensembl', 'GRCh37', 'latest')
        graph = RDF::URI.new(config['base_url']).join("/graph/#{key}")

        load_dir path, '*.ttl', graph
      when 'ensembl38'
        path = File.join(config['load_dir'], 'virtuoso', 'ensembl', 'GRCh38', 'latest')
        graph = RDF::URI.new(config['base_url']).join("/graph/#{key}")

        load_dir path, '*.ttl.gz', graph
      else
        raise("unknown name: #{name}")
      end
    end

    def self.banner(task, namespace = false, subcommand = true)
      super
    end

    private

    # OpenLink Interactive SQL (Virtuoso), version 0.9849b.
    #
    #    Usage :
    # isql <HOST>[:<PORT>] <UID> <PWD> file1 file2 ...
    #
    # isql -H <server_IP> [-S <server_port>] [-U <UID>] [-P <PWD>]
    #      [-E] [-X <pkcs12_file>] [-K] [-C <num>] [-b <num>]
    #      [-u <name>=<val>]* [-i <param1> <param2>]
    #      isql -?
    # Connection options:
    #
    #   -?                  - This help message
    #   -U username         - Specifies the login user ID
    #   -P password         - Specifies the login password
    #   -H server_addr      - Specifies the Server address (IP)
    #   -S server port      - Specifies the TCP port to connect to
    #   -E                  - Specifies that encryption will be used
    #   -C                  - Specifies that password will be sent in cleartext
    #   -X pkcs12_file      - Specifies that encryption & X509 certificates will
    #                         be used
    #   -T server_cert      - Specifies that CA certificate file to be used
    #   -b size             - Specifies that large command buffer to be used
    #                         (in KBytes)
    #   -K                  - Shuts down the virtuoso on connecting to it
    #
    # Parameter passing options:
    #
    #   -u name1=val1... - Everything after -u is stored to associative array U,
    #                         until -i is encountered. If no equal sign then value
    #                         is NULL
    #   -i                  - Ignore everything after the -i option, after which
    #                         comes arbitrary input parameter(s) for isql procedure,
    #                         which can be referenced with $ARGV[$I] by the
    #                         ISQL-commands.
    #   <OPT>=<value>       - Sets the ISQL options
    #
    #   Note that if none of the above matches then the non-options go as
    #   <HOST>[:<PORT>] <UID> <PWD> file1 file2 ...
    def load_dir(path, pattern, graph, parallel = 1)
      config = Rails.configuration.virtuoso

      host = config['host'] || 'localhost'
      isql = config['isql'] || 'isql'
      port = config['port'] || 1111
      user = config['user'] || 'dba'
      password = config['password'] || 'dba'

      parallel = parallel.to_i.zero? ? 1 : parallel

      run <<-BASH, verbose: false
        #{isql} -H #{host} -S #{port} -U #{user} -P #{password} VERBOSE=OFF BANNER=OFF EXEC="ld_dir('#{path}', '#{pattern}', '#{graph}');"

        echo "Graph: #{graph}"
        echo "Files to be loaded"
        echo
        #{isql} -H #{host} -S #{port} -U #{user} -P #{password} VERBOSE=OFF BANNER=OFF EXEC="SELECT ll_file FROM DB.DBA.LOAD_LIST where ll_state = 0;"

        for i in $(seq 1 #{parallel}); do
          #{isql} -H #{host} -S #{port} -U #{user} -P #{password} VERBOSE=OFF BANNER=OFF EXEC="rdf_loader_run();" &
        done

        wait

        echo
        echo "Checkpoint"
        echo
        #{isql} -H #{host} -S #{port} -U #{user} -P #{password} VERBOSE=OFF BANNER=OFF EXEC="checkpoint;"

        echo
        echo "Errors"
        echo
        #{isql} -H #{host} -S #{port} -U #{user} -P #{password} VERBOSE=OFF BANNER=OFF EXEC="SELECT count(*) FROM DB.DBA.LOAD_LIST WHERE ll_error IS NOT NULL;"
        #{isql} -H #{host} -S #{port} -U #{user} -P #{password} VERBOSE=OFF BANNER=OFF EXEC="SELECT * FROM DB.DBA.LOAD_LIST WHERE ll_error IS NOT NULL;"
      BASH
    end

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
