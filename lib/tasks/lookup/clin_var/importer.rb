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

        def records
          return to_enum(__method__) unless block_given?

          reader.open(@file_path) do |f|
            @io = CSV.new(f, col_sep: ' ', skip_lines: '^#')
            @io.each do |r|
              hash = { tgv_id:    to_int(r[1].sub('tgv', '')),
                       allele_id: to_int(r[6]) }
              yield hash
            end
          end
        end
      end
    end
  end
end
