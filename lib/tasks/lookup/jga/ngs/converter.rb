require 'csv'
require 'tasks/lookup/converter_base'

module Tasks
  module Lookup
    module JGA
      module NGS
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

            records do |hash|
              lookup = ::Lookup.new(tgv_id: hash[:tgv_id]) do |l|
                l.jga_ngs = ::Lookup::JGA::NGS.new do |e|
                  e.num_alleles     = hash[:num_alleles]
                  e.num_alt_alleles = hash[:num_alt_alleles]
                  e.frequency       = hash[:frequency]
                  e.quality_score   = hash[:quality_score]
                  e.passed          = hash[:passed]
                end
              end

              begin
                yield lookup
              rescue StandardError => e
                msg = e.message
                msg << " tgv_id: #{hash[:tgv_id]}"
                log(msg, :error)
                raise e
              ensure
                thread[:done] = @io.lineno if thread
              end
            end
          end

          def records
            return to_enum(__method__) unless block_given?

            reader.open(@file_path) do |f|
              @io = CSV.new(f, col_sep: ' ', skip_lines: '^#')
              @io.each do |r|
                hash = { tgv_id:          to_int(r[1].sub('tgv', '')),
                         num_alt_alleles: to_int(r[6]),
                         num_alleles:     to_int(r[7]),
                         frequency:       to_float(r[8]),
                         quality_score:   to_float(r[9]),
                         passed:          passed?(r[10]) }
                yield hash
              end
            end
          end
        end
      end
    end
  end
end
