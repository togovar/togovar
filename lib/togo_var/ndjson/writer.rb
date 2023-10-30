# frozen_string_literal: true

require 'zlib'

module TogoVar
  module Ndjson
    class Writer
      CHUNK_SIZE = 50 * 1024 * 1024

      class << self
        def open(prefix, **options, &block)
          writer = new(prefix, **options)

          return writer unless block_given?

          begin
            yield writer
          ensure
            writer.close
          end
        end
      end

      def initialize(prefix, **options)
        @file_number = 0
        @dir = File.dirname(prefix)
        @prefix = File.basename(prefix)
        @gzip = options.key?(:gzip) ? options[:gzip] : true
        @chunk_size = Integer(options[:chunk_size], exception: false) || CHUNK_SIZE
        @byte_count = 0
        @writer = new_writer
      end

      def suffix
        @gzip ? '.ndjson.gz' : '.ndjson'
      end

      def new_writer
        @gzip ? Zlib::GzipWriter.open(output) : File.open(output, 'w')
      end

      def output
        File.join(@dir, "#{@prefix}#{@file_number}#{suffix}")
      end

      def write(*contents)
        if @byte_count > @chunk_size
          @writer.close
          @file_number += 1
          @byte_count = 0
          @writer = new_writer
        end

        @byte_count += contents.map do |x|
          [@writer.write(x.to_json), @writer.write("\n")].sum
        end.sum
      end

      def close
        @writer.close
      end
    end
  end
end
