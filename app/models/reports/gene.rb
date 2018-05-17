module Reports
  class Gene
    include Queryable

    class << self
      def find(id)
        sparql = <<-SPARQL.strip_heredoc
          DEFINE sql:select-option "order"
          PREFIX up: <http://purl.uniprot.org/core/>

          SELECT DISTINCT ?name ?ensembl_gene
          WHERE {
            GRAPH <http://togovar.org/graph/tgup> {
              <http://togovar.org/gene/9606:#{id}> rdfs:seeAlso ?uniprot_id .
              ?uniprot_id rdf:type <http://identifiers.org/uniprot> ;
                          rdfs:seeAlso ?uniprot_up .
            }
            GRAPH <http://togovar.org/graph/uniprot> {
              ?uniprot_up up:recommendedName/up:fullName ?name
              OPTIONAL {
                ?uniprot_up rdfs:seeAlso ?ensembl_transcript .
                ?ensembl_transcript a up:Transcript_Resource ;
                  up:transcribedFrom ?ensembl_gene .
              }
            }
          }
        SPARQL

        gene = query(sparql).first

        if (uri = gene[:ensembl_gene])
          gene[:ensembl_gene] = uri.split('/').last
        end

        OpenStruct.new(gene)
      end
    end
  end
end
