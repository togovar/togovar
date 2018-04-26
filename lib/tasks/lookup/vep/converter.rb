require 'awesome_print'
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

          def test(*args)
            new(*args).parse_test
          end
        end

        def initialize(*args)
          super
        end

        def parse_test
          build_model(records.first)
        end

        private

        def task(thread)
          if thread
            thread[:done]  = 0
            thread[:total] = CSV.count_row(@file_path)
          end

          records.each do |r|
            begin
              yield build_model(r)
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

        def build_model(hash)
          ::Lookup.new({ tgv_id: hash[:tgv_id] }.merge(hash[:base])) do |l|
            l.transcripts = hash[:transcripts].map do |x|
              ::Lookup::Transcript.new(x)
            end
          end
        end

        def records(&block)
          return to_enum(__method__) unless block_given?

          reader.open(@file_path) do |f|
            @io = CSV.new(f, col_sep: ' ', skip_lines: '^#')
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

            (record[:transcripts] ||= []) << transcript(@line)

            current_id = @line[0]
            @line      = nil
          end
          mark_most_severe_consequence(record[:transcripts])
          record
        end

        def base(row)
          chr, start, stop = row[1].split(/[:-]/)
          {
            chromosome:   chr,
            start:        to_int(start),
            stop:         to_int(stop || start),
            variant_type: variant_type(row[17]),
            reference:    filter_blank(row[30])&.upcase,
            alternative:  filter_blank(row[2])&.upcase,
            rs:           rs_list(row[12]),
            hgvs_g:       filter_blank(row[26])
          }
        end

        # @return [Hash, nil]
        def transcript(row)
          { ensg_id:       filter_blank(row[3]),
            enst_id:       filter_blank(row[4]),
            symbol:        filter_blank(row[18]),
            symbol_source: filter_blank(row[19]),
            ncbi_gene_id:  to_int(filter_blank(row[20])),
            hgvs_c:        filter_blank(row[26]),
            consequences:  consequences(row[6]),
            sift:          extract_value(row[21]),
            polyphen:      extract_value(row[22]) }
        end

        # @return [Int, nil]
        def variant_type(str)
          SequenceOntology.find_by_label(str).id
        end

        # @return [Array, nil]
        def rs_list(str)
          return nil unless filter_blank(str)
          rs = str.split(',').select { |x| x.match?(/^rs/) }
          return nil if rs.empty?
          rs
        end

        def consequences(str)
          return nil unless filter_blank(str)
          str.split(',').map { |x| SequenceOntology.find_by_label(x).id }.compact
        end

        # @return [Hash, nil]
        def extract_value(str)
          return nil unless filter_blank(str)
          if (m = str.match(/(\w+)\(([0-9.]+)\)/))
            to_float(m[2])
          else
            msg = "failed to parse value: #{str}"
            msg << " at line #{@io.lineno}"
            log(msg, :warn)
            nil
          end
        end

        def mark_most_severe_consequence(transcripts)
          return transcripts if transcripts.blank?

          ::Lookup::Transcript::CONSEQUENCES_ORDER.each do |so|
            t = transcripts.select do |x|
              if (c = x[:consequences])
                c.map { |y| y == so }.any?
              end
            end
            next unless t.present?

            t.each do |x|
              x[:most_severe] = true
            end
            break
          end

          transcripts
        end
      end
    end
  end
end
