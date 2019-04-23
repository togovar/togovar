require 'json'
require 'zlib'

module TogoVar
  module IO
    class NDJSON
      def self.open(*args)
        writer = new(*args)

        if block_given?
          begin
            yield writer
          ensure
            writer.close
          end
        end
      end

      FILE_LIMIT_BYTE = (100 * 1024 * 1024)

      def initialize(*args)
        options = args.last.is_a?(Hash) ? args.pop : {}

        @prefix = options.delete(:prefix) || ''

        raise("Unknown option: #{options.keys.first}") unless options.keys.empty?

        @file_index = 1
        @byte_count = 0
        @gzip = nil
      end

      # @param [Array<Object#to_json>] data action and source
      def write(data)
        @gzip ||= Zlib::GzipWriter.open("#{@prefix}#{@file_index}.ndjson.gz")

        data.each do |x|
          @byte_count += @gzip.write(x.to_json << "\n")
        end

        return if @byte_count < (FILE_LIMIT_BYTE * 0.9)

        @file_index += 1
        @byte_count = 0
        close
      end

      def close
        @gzip&.close
        @gzip = nil
      end
    end
  end
end
