require 'csv'
require 'tasks/lookup/importer_base'

module Tasks
  module Lookup
    module ClinVar
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
            lookups    = ::Lookup.in(tgv_id: g.collect { |h| h[:tgv_id] })
            operations = lookups.map do |lookup|
              json    = g.find { |hash| hash[:tgv_id] == lookup.tgv_id }.as_json
              clinvar = { clinvar_info: json.tap { |hash| hash.delete('tgv_id') } }
              doc     = lookup.as_json.merge(clinvar).deep_reject { |k, _| k == '_id' }
              update_operation(lookup.id, doc)
            end
            ::Lookup.collection.bulk_write(operations)
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

            record[:tgv_id]       ||= to_int(@line[0].sub('tgv', ''))
            record[:allele_id]    ||= to_int(@line[1])
            record[:significance] ||= @line[2]
            (record[:conditions] ||= []) << @line[3]

            current_id = @line[0]
            @line      = nil
          end
        end
      end
    end
  end
end
