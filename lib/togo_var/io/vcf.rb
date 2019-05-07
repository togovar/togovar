require 'zlib'

module TogoVar
  module IO
    class VCF
      class Info
        module Types
          INTEGER = :integer
          FLOAT = :float
          FLAG = :flag
          CHARACTER = :character
          STRING = :string
        end

        class << self
          def parse(str)
            str.strip!
            str.sub!(/^##INFO=/, '')
            str.sub!(/^</, '')
            str.sub!(/>$/, '')

            attributes = CSV.parse_line(str, quote_char: "\0")
            attributes.each.with_index { |x, i| attributes[i - 1] << x unless x.match?(/^\w+=.*$/) }

            attributes = attributes.select { |x| x.match?(/^\w+=.*$/) }
                           .map { |x| x.split('=') }
                           .to_h
                           .transform_keys(&:downcase)
                           .symbolize_keys

            if attributes[:number]
              attributes[:number] = if attributes[:number] == '.'
                                      nil
                                    else
                                      attributes[:number].to_i
                                    end
            end

            if attributes[:type]
              attributes[:type] = Info::Types.const_get(attributes[:type].upcase)
            end

            if attributes[:description]
              attributes[:description].sub!(/^"/, '')
              attributes[:description].sub!(/"$/, '')
            end

            new(**attributes)
          end
        end

        attr_accessor :id
        attr_accessor :number
        attr_accessor :type
        attr_accessor :description

        def initialize(**hash)
          hash.each { |k, v| send("#{k}=", v) if respond_to?(k) }
        end
      end

      class Metadata
        class << self
          def parse(*headers)
            meta = new

            headers.each do |line|
              case line
              when /^##fileformat/
                meta.fileformat = line.split('=').last
              when /^##INFO/
                i = Info.parse(line)
                meta.info ||= {}
                meta.info[i.id] = i
              else
                next
              end
            end

            meta
          end
        end

        attr_accessor :fileformat
        attr_accessor :info
      end

      class Row
        class << self
          def parse(str)
            columns = CSV.parse_line(str, col_sep: "\t")

            new do |row|
              row.chrom = columns[0]
              row.pos = columns[1].to_i
              row.id = columns[2]
              row.ref = columns[3]
              row.alt = columns[4]
              row.qual = columns[5].to_f unless columns[5] == '.'
              row.filter = columns[6] unless columns[6] == '.'
              if columns[7]
                row.info = columns[7].split(';').map { |x| x.split('=') }.to_h
              end
            end
          end
        end

        attr_accessor :chrom
        attr_accessor :pos
        attr_accessor :id
        attr_accessor :ref
        attr_accessor :alt
        attr_accessor :qual
        attr_accessor :filter
        attr_accessor :info

        def initialize
          yield self if block_given?
        end
      end

      class << self
        def open(*args)
          f = if args.first.match?(/\.gz$/)
                Zlib::GzipReader.open(*args)
              else
                File.open(*args)
              end

          begin
            vcf = new(f)
          rescue StandardError => e
            f.close
            raise e
          end

          if block_given?
            begin
              yield vcf
            ensure
              vcf.close
            end
          else
            vcf
          end
        end

        def foreach(path, options = Hash.new, &block)
          return to_enum(__method__, path, options) unless block

          open(path, options) do |vcf|
            vcf.each(&block)
          end
        end
      end

      attr_reader :lineno
      attr_reader :metadata

      include Enumerable

      def initialize(data, options = {})
        raise ArgumentError, 'Cannot parse nil' if data.nil?

        @io = data.is_a?(String) ? StringIO.new(data) : data
        @lineno = 0

        headers = []
        loop do
          break if !(line = @io.gets) || line.match?(/^#CHROM/)

          headers << line.strip
          @lineno += 1
        end

        @metadata = Metadata.parse(*headers)
      end

      def close
        @io&.close
      end

      def each
        if block_given?
          while (variant = shift)
            yield variant
          end
        else
          to_enum
        end
      end

      def shift
        return nil unless (line = @io.gets)

        @lineno += 1

        Row.parse(line.chomp)
      end
    end
  end
end
