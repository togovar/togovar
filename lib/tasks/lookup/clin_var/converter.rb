require 'csv'
require 'tasks/lookup/converter_base'

module Tasks
  module Lookup
    module ClinVar
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

          records.each_slice(@batch_num) do |g|
            ids = g.map { |r| r[6] }

            client = SPARQL::Client.new('http://togovar.org/sparql')
            result = client.query(sparql(ids))

            result.group_by(&:allele_id).each do |id, results|
              significance = results.map(&:significance).map(&:to_s).map { |x| x.split(/[,\/]/) }.flatten.uniq.map(&:downcase)
              phenotype =  results.map(&:phenotype).map(&:to_s)

              tgv_id = g.find { |x| x[6] == id.to_s }[1].sub('tgv', '').to_i
              lookup = ::Lookup.new(tgv_id: tgv_id) do |l|
                l.clinvar = ::Lookup::ClinVar.new do |c|
                  c.allele_id = id.to_s.to_i
                  c.significances = significance
                  c.conditions = phenotype
                end
              end

              begin
                yield lookup
              rescue StandardError => e
                msg = e.message
                msg << " tgv_id: #{tgv_id}"
                log(msg, :error)
                raise e
              ensure
                thread[:done] = @csv.lineno if thread
              end
            end
          end
        end

        def records(&block)
          return to_enum(__method__) unless block_given?

          reader.open(@file_path) do |f|
            @csv = CSV.new(f, col_sep: ' ', skip_lines: '^#')
            @csv.each(&block)
          end
        end

        def sparql(alleles)
          values = alleles.map { |x| "cv_allele:#{x}" }.join(' ')
          <<-SPARQL.strip_heredoc
            DEFINE sql:select-option "order"
            PREFIX dc: <http://purl.org/dc/terms/>
            PREFIX obo: <http://purl.obolibrary.org/obo/>
            PREFIX faldo: <http://biohackathon.org/resource/faldo#>
            PREFIX cvo: <http://purl.jp/bio/10/clinvar/>
            PREFIX cv_allele: <http://purl.jp/bio/10/clinvar.allele/>

            SELECT DISTINCT ?allele_id ?significance ?phenotype
            FROM <http://togovar.org/graph/clinvar>
            WHERE {
              VALUES ?allele { #{values} }
              ?allele dc:identifier ?allele_id ;
                cvo:clinicalSignificance ?significance ;
                cvo:phenotype ?phenotype .
              FILTER (?phenotype NOT IN ( "not specified" ))
            }
          SPARQL
        end
      end
    end
  end
end
