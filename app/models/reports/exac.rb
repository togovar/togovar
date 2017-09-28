module Reports
  class Exac
    include Queryable

    class << self
      # @param [String] id e.g. 22-46615715-G-A
      def genes(id)
        sparql = <<-SPARQL.strip_heredoc
          DEFINE sql:select-option "order"
          PREFIX exo: <#{Endpoint.prefix.exo}>
          SELECT DISTINCT ?gene
          FROM <#{Endpoint.ontology.exac}> {
            VALUES ?variant { <#{Endpoint.prefix.exid}#{id}> }
            ?variant exo:annotation/exo:ensemblGene ?gene
          }
        SPARQL

        query(sparql).map { |x| x[:gene].split('/').last }
      end
    end
  end
end
