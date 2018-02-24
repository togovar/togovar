require 'csv'
require 'ruby-progressbar'

module Tasks
  module Lookup
    module ClinVar
      class Disease
        include Queryable

        attr_accessor :alleles

        EP = 'http://ep.dbcls.jp/sparql72hv'.freeze

        # write TSV to STDOUT
        def tsv
          return nil if alleles.blank?

          progress

          Array(alleles).each_slice(300) do |g|
            tsv = CSV.generate(col_sep: "\t") do |tsv|
              Disease.query(sparql(g), endpoint: EP).each do |r|
                tsv << [r[:allele_id], r[:significance], r[:phenotype]]
              end
            end
            puts tsv
            progress.progress += g.count if progress
          end
        end

        def sparql(alleles)
          values = alleles.map { |x| "cv_allele:#{x}" }.join(' ')
          <<-SPARQL
            DEFINE sql:select-option "order"
            PREFIX dc: <http://purl.org/dc/terms/>
            PREFIX obo: <http://purl.obolibrary.org/obo/>
            PREFIX faldo: <http://biohackathon.org/resource/faldo#>
            PREFIX cvo: <http://purl.jp/bio/10/clinvar/>
            PREFIX cv_allele: <http://purl.jp/bio/10/clinvar.allele/>

            SELECT DISTINCT ?allele_id ?significance ?phenotype
            FROM <http://togogenome.org/variation/clinvar>
            WHERE {
              VALUES ?allele { #{values} }
              ?allele dc:identifier ?allele_id ;
                cvo:clinicalSignificance ?significance ;
                cvo:phenotype ?phenotype .
            }
          SPARQL
        end

        private

        def progress
          return nil if STDOUT.tty?
          @progress ||= ProgressBar.create(format: '%t|%B| %J%% %a (%E)',
                                           total:  alleles.count,
                                           output: STDERR)
        end
      end
    end
  end
end
