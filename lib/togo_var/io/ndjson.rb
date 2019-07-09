require 'json'
require 'zlib'

module TogoVar
  module IO
    class NDJSON

      EXTENSION = '.ndjson.gz'.freeze

      def self.open(filename, file_torate: true, start: 1)
        file = Zlib::GzipWriter.open("#{filename}#{file_torate ? start.to_i : nil}#{EXTENSION}")

        begin
          ndjson = new(file, prefix: filename, file_torate: file_torate, start: start.to_i)
        rescue StandardError => e
          file.close
          raise e
        end

        return ndjson unless block_given?

        begin
          yield ndjson
        ensure
          ndjson.close
        end
      end

      FILE_LIMIT_BYTE = (100 * 1024 * 1024)

      def initialize(data, options = {})
        @io = data.is_a?(String) ? StringIO.new(data) : data

        @prefix = options.delete(:prefix) || ''
        @file_torate = options.delete(:file_torate)
        @file_index = options.delete(:start).to_i

        raise("Unknown option: #{options.keys.first}") unless options.keys.empty?

        @byte_count = 0
      end

      # @param [Array<Object#to_json>] data action and source
      def write(data)
        data.each do |x|
          @byte_count += @io.write(x.to_json << "\n")
        end

        return unless @file_torate && @byte_count > (FILE_LIMIT_BYTE * 0.9)
        return unless @io.is_a?(Zlib::GzipWriter)

        close

        @file_index += 1
        @byte_count = 0
        @io = Zlib::GzipWriter.open("#{@prefix}#{@file_index}#{EXTENSION}")
      end

      alias << write

      def close
        @io&.close
        @io = nil
      end
    end
  end
end
