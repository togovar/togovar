module Reports
  class Variation
    include Queryable

    class << self
      def variation_id_for_allele(allele_id)
        query(<<-SPARQL, endpoint: 'http://ep.dbcls.jp/sparql72hv').first[:variation_id]
        DEFINE sql:select-option "order"
        PREFIX dcterms: <http://purl.org/dc/terms/>
        PREFIX cvo: <http://purl.jp/bio/10/clinvar/>
        PREFIX cv_allele: <http://purl.jp/bio/10/clinvar.allele/>

        SELECT ?variation_id
        FROM <http://togogenome.org/variation/clinvar> 
        WHERE {
          ?variation cvo:allele cv_allele:#{allele_id} ;
            dcterms:identifier ?variation_id .
        }
        LIMIT 1
        SPARQL
      end
    end
  end
end
