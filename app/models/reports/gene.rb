module Reports
  class Gene
    include Queryable

    class << self
      def find(id)
        sparql = <<-SPARQL.strip_heredoc
        DEFINE sql:select-option "order"
        PREFIX up: <#{Endpoint.prefix.up}>
        SELECT DISTINCT ?name
        WHERE {
          GRAPH <#{Endpoint.ontology.tgup}> {
            <http://togogenome.org/gene/#{id}> rdfs:seeAlso ?uniprot_id .
            ?uniprot_id rdf:type <http://identifiers.org/uniprot> ;
                        rdfs:seeAlso ?uniprot_up .
          }
          GRAPH <#{Endpoint.ontology.uniprot}> {
            ?uniprot_up up:recommendedName/up:fullName ?name
          }
        }
        SPARQL

        OpenStruct.new(query(sparql).first)
      end
    end
  end
end
