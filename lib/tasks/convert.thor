require 'date'
require 'thor'
require 'togo_var'

module Tasks
  class Convert < Thor
    include Thor::Actions

    namespace :convert

    desc 'vep FILE', 'convert VEP annotations to another format'
    option :input, banner: 'FORMAT', aliases: '-i', type: :string, enum: %i[vcf], default: 'vcf', desc: 'Set input format'
    option :output, banner: 'FORMAT', aliases: '-o', type: :string, enum: %i[ntriples], default: 'ntriples', desc: 'Set output format'
    option :directory, aliases: '-d', type: :string, desc: 'Set output directory, use current directory if not given'

    def vep(filename)
      input_filename = File.expand_path(filename)
      directory = File.expand_path(options[:directory] ? options[:directory] : '.')

      case options[:output]
      when 'ntriples'
        formatter = TogoVar::RDF::Formatter.for(:vep)
        output_filename = "#{DateTime.now.strftime('%Y%m%d_%H%M_')}"\
                          "#{File.basename(filename, File.extname(filename))}.%d.nt.gz".freeze
        writer = RDF::Writer.for(:ntriples)
      else
        raise ArgumentError, "Unknown format: #{options[:output]}"
      end

      gzip = Zlib::GzipWriter.open(output_filename % (file_index = 1))
      file = writer.new(gzip)

      inside(directory, verbose: false) do
        begin
          TogoVar::IO::VCF.new(input_filename).each do |record|
            if record.alt.size > 1
              warn 'Skipped multi allelic variation: '\
                   "id = #{record.id}, pos = #{record.pos}, ref = #{record.ref}, alt = #{record.alt}"
            else
              formatter.record = record

              if gzip.nil?
                gzip = Zlib::GzipWriter.open(output_filename % (file_index += 1))
                file = writer.new(gzip)
              end

              formatter.to_statements.each { |statement| file << statement }
            end

            next unless (record.record_number % 1_000_000).zero?

            gzip.close
            gzip = nil
          rescue StandardError => e
            headers = record&.header&.lines&.size
            records = record&.record_number
            fields = record&.fields
            warn "Line: #{headers + records}" if headers && records
            warn "Fields: #{fields.to_s}" if fields
            raise e
          end
        ensure
          gzip.close
        end
      end
    end
  end
end
