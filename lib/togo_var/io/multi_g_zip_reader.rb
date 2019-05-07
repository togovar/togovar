require 'zlib'

module TogoVar
  module IO
    class MultiGZipReader
      class << self
        def open(filename)
          gz = new(File.open(filename, 'rb'))

          if block_given?
            begin
              yield gz
            ensure
              gz.close
            end
          else
            gz
          end
        end
      end

      attr_reader :lineno

      def initialize(io)
        @io = io
        @lineno = 0
      end

      def close
        @io.close
      end

      def each_line(**options)
        return to_enum(__method__, **options) unless block_given?

        unused = 0
        buf = nil

        skip = options.delete(:skip_lines)

        until @io.eof?
          Zlib::GzipReader.wrap(@io) do |gz|
            gz.each_line do |x|
              unless x.end_with?("\n")
                buf = x
                next
              end

              line = buf.to_s + x

              unless skip && line.match?(skip)
                yield line
              end

              @lineno += 1
              buf = nil
            end
            unused = (u = gz.unused) ? u.size : 0
            gz.finish
          end
          @io.seek(-unused, ::IO::SEEK_CUR)
        end

        @io.close
      end

      def gets
        @line ||= each
        begin
          @line.next
        rescue StopIteration
          nil
        end
      end

      alias each each_line
    end
  end
end
