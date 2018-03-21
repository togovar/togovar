module Reports
  class Gene
    include Queryable

    class << self
      def find(id)
        sparql = <<-SPARQL.strip_heredoc
          DEFINE sql:select-option "order"
          PREFIX up: <http://purl.uniprot.org/core/>

          SELECT DISTINCT ?name
          WHERE {
            GRAPH <http://togovar.org.graph/tgup> {
              <http://togovar.org/gene/#{id}> rdfs:seeAlso ?uniprot_id .
              ?uniprot_id rdf:type <http://identifiers.org/uniprot> ;
                          rdfs:seeAlso ?uniprot_up .
            }
            GRAPH <http://togovar.org.graph/uniprot> {
              ?uniprot_up up:recommendedName/up:fullName ?name
            }
          }
        SPARQL

        OpenStruct.new(query(sparql).first)
      end
    end
  end
end
