class Disease
  include Queryable

  class << self
    def list(offset: 0, limit: 1_000)
      sparql = <<-EOS.strip_heredoc
        DEFINE sql:select-option "order"
        PREFIX dc: <#{Endpoint.prefix.dc}>
        PREFIX cv: <#{Endpoint.prefix.cv}>
        PREFIX cvid: <#{Endpoint.prefix.cvid}>
        SELECT DISTINCT ?cvid ?phenotype
        FROM <#{Endpoint.ontology.clinvar}> {
          ?cvid cv:submission ?submission .
          OPTIONAL {
            ?submission cv:reportedPhenotypeInfo ?phenotype .
          }
          FILTER ( ?phenotype NOT IN ("not provided", "not specified") )
        }
        OFFSET #{offset}
        LIMIT #{limit}
      EOS

      query(sparql)
    end
  end
end
