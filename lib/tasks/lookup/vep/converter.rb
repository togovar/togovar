require 'csv'
require 'tasks/lookup/converter_base'

module Tasks
  module Lookup
    module Vep
      class Converter < ConverterBase
        class << self
          def convert(*args, &block)
            new(*args).start(&block)
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

          records.each do |r|
            lookup = ::Lookup.new(tgv_id: r[:tgv_id]) do |l|
              l.base = ::Lookup::BaseInfo.new(r[:base])

              ma = ::Lookup::MolecularAnnotation.new(r[:molecular_annotation]) do |m|
                m.transcripts = r[:transcripts].map do |x|
                  ::Lookup::MolecularAnnotation::Transcript.new(x)
                end
              end

              l.molecular_annotation = ma
            end

            begin
              yield lookup.to_rdf
            rescue StandardError => e
              msg = e.message
              msg << " #{@file_path}" if @file_path
              msg << " at line #{@io.lineno}," if @io.respond_to?(:lineno)
              msg << " tgv_id: #{r[:tgv_id]}" if r[:tgv_id]
              msg << "\n"
              msg << e.backtrace.join("\n")
              log(msg, :error)
            ensure
              thread[:done] = @io.lineno if thread
            end
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

            record[:base] ||= base(@line)

            record[:molecular_annotation] ||= molecular_annotation(@line)

            (record[:transcripts] ||= []) << transcript(@line)

            current_id = @line[0]
            @line      = nil
          end
        end

        def base(row)
          chr, start, stop = row[1].split(/[:-]/)
          {
            chromosome:    chr,
            start:         to_int(start),
            stop:          to_int(stop || start),
            reference:     filter_blank(row[30])&.upcase,
            alternative:   filter_blank(row[2])&.upcase,
            rs:            rs_list(row[12])
          }
        end

        def molecular_annotation(row)
          {
            gene:          filter_blank(row[3]),
            symbol:        filter_blank(row[18]),
            symbol_source: filter_blank(row[19]),
            hgvs_g:        filter_blank(row[26])
          }
        end

        # @return [Int, nil]
        def variant_class(str)
          SequenceOntology.find_by_label(str).id
        end

        # @return [Array, nil]
        def rs_list(str)
          return nil unless filter_blank(str)
          rs = str.split(',').select { |x| x.match?(/^rs/) }
          return nil if rs.empty?
          rs
        end

        # @return [Hash, nil]
        def transcript(row)
          values = [variant_class(row[17]),
                    consequences(row[6]),
                    filter_blank(row[23]),
                    sift(row[21]),
                    polyphen(row[22])]
          return nil unless values.any?

          Hash[%i[variant_class consequences hgvs_c sift polyphen].zip(values)]
        end

        def consequences(str)
          return nil unless filter_blank(str)
          str.split(',').map { |x| SequenceOntology.find_by_label(x).id }.compact
        end

        # @return [Hash, nil]
        def sift(str)
          return nil unless filter_blank(str)
          if (m = str.match(/(\w+)\(([0-9.]+)\)/))
            to_float(m[2])
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
