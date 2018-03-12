module Reports
  class Variation
    include Queryable

    class << self
      def variation_id_for_allele(allele_id)
        result = query(<<-SPARQL, endpoint: 'http://ep.dbcls.jp/sparql72hv')
          DEFINE sql:select-option "order"
          PREFIX dcterms: <http://purl.org/dc/terms/>
          PREFIX cvo: <http://purl.jp/bio/10/clinvar/>
          PREFIX cv_allele: <http://purl.jp/bio/10/clinvar.allele/>

          SELECT ?variation_id
          FROM <http://togovar.org/graph/clinvar>
          WHERE {
            ?variation cvo:allele cv_allele:#{allele_id} ;
              dcterms:identifier ?variation_id .
          }
          LIMIT 1
        SPARQL

        result.first[:variation_id] if result.first
      end
    end
  end
end
