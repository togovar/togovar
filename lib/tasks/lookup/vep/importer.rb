require 'csv'
require 'tasks/lookup/vep/consequence'
require 'tasks/lookup/vep/variant_class'
require 'tasks/lookup/importer_base'

module Tasks
  module Lookup
    module Vep
      class Importer < ImporterBase
        class << self
          def import(*args)
            new(*args).start
          end
        end

        def initialize(*args)
          super
        end

        private

        def task(thread)
          if thread
            thread[:done]  = 0
            thread[:total] = CSV.count_row(@file_path)
          end

          records.each_slice(@batch_num) do |g|
            ::Lookup.collection.insert_many(g)
            thread[:done] = @io.lineno if thread
          end
        end

        def records(&block)
          return to_enum(__method__) unless block_given?

          reader.open(@file_path) do |f|
            @io = CSV.new(f, col_sep: "\t", skip_lines: '^#')
            each(&block)
          end
          @io = nil
        end

        def each
          if block_given?
            while (record = shift)
              yield record
            end
          else
            to_enum
          end
        end

        # @return [Hash] an entry which is grouped by first column's value
        def shift
          record     = {}
          current_id = nil

          loop do
            # read one line but do not read if @line is present
            return nil unless @line ||= @io.readline

            # keep @line and return the entry if ID changes
            break record if current_id && current_id != @line[0]

            record[:tgv_id] ||= to_int(@line[0].sub('tgv', ''))

            record[:base]   ||= base(@line)

            record[:molecular_annotation] ||= molecular_annotation(@line)

            if (t = transcript(@line))
              (record[:molecular_annotation][:transcripts] ||= []) << t
            end

            current_id = @line[0]
            @line      = nil
          end
        end

        def base(row)
          {
            chromosome:         row[1].split(':')[0],
            position:           to_int(position(row[1].split(':')[1])),
            allele:             filter_blank(row[2]),
            existing_variation: existing_variation(row[12]),
            variant_class:      variant_class(row[17])
          }
        end

        def molecular_annotation(row)
          {
            gene:   filter_blank(row[3]),
            symbol: filter_blank(row[18])
          }
        end

        # @return [Int, nil]
        def position(str)
          return nil unless filter_blank(str)
          v = if (m = str.match(/(\d+)-\d+/))
                msg = "position format: #{str}"
                msg << " at line #{@io.lineno}"
                log(msg, :warn)
                m[1]
              else
                str
              end
          to_int(v)
        end

        # @return [String, nil]
        def existing_variation(str)
          return nil unless filter_blank(str)
          return nil unless str.match?(/^rs/)
          str
        end

        include VariantClass

        # @return [Int, nil]
        def variant_class(str)
          return nil unless filter_blank(str)
          vc_to_id(str)
        rescue VariantClass::ParseError
          msg = "unknown variant class: #{str}"
          msg << " at line #{@io.lineno}"
          log(msg, :warn)
          nil
        end

        include Consequence

        # @return [Hash, nil]
        def transcript(row)
          values = [consequences(row[6]),
                    filter_blank(row[13]),
                    sift(row[21]),
                    polyphen(row[22]),
                    filter_blank(row[23])]
          return nil unless values.any?

          Hash[%i[consequences impact sift polyphen hgvsc].zip(values)]
        end

        def consequences(str)
          parse_consequences(str)
        rescue Consequence::ParseError
          msg = "unknown consequence: #{row[6]}"
          msg << " at line #{@io.lineno}"
          log(msg, :warn)
          nil
        end

        # @return [Hash, nil]
        def sift(str)
          return nil unless filter_blank(str)
          if (m = str.match(/(\w+)\(([0-9.]+)\)/))
            Hash[%i[prediction value].zip([m[1], to_float(m[2])])]
          else
            msg = "failed to parse sift: #{str}"
            msg << " at line #{@io.lineno}"
            log(msg, :warn)
            nil
          end
        end

        # @return [Hash, nil]
        def polyphen(str)
          sift(str)
        end
      end
    end
  end
end
