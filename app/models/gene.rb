class Gene
  include Queryable
  include Elasticsearch::Model
  include Elasticsearch::Model::Callbacks

  # define elasticsearch index and type for model
  index_name 'gene'
  document_type 'name'

  # custom elasticsearch mapping per autocompletion
  mapping do
    indexes :name, type: 'string'
    indexes :suggest, type: 'completion'
  end

  class << self
    # class method to execute autocomplete search
    def auto_complete(term)
      return nil if term.blank?

      query = {
        suggest: {
          text:       term,
          completion: {
            field: 'suggest'
          }
        }
      }
      client.suggest(index: index_name, body: query)['suggest'].first['options']
    end

    def list(offset: 0, limit: 1_000)
      sparql = <<-EOS.strip_heredoc
        DEFINE sql:select-option "order"
        PREFIX insdc: <#{Endpoint.prefix.insdc}>
        PREFIX obo: <#{Endpoint.prefix.obo}>
        PREFIX idtax: <#{Endpoint.prefix.idtax}>
        SELECT DISTINCT ?gene_name ?togogenome
        WHERE
        {
          GRAPH <#{Endpoint.ontology.refseq}>
          {
            ?refseq_gene obo:RO_0002162 idtax:9606 ;
              rdf:type insdc:Gene ;
              rdfs:label ?gene_name .
          }
          GRAPH <#{Endpoint.ontology.tgup}>
          {
            ?togogenome skos:exactMatch ?refseq_gene .
          }
        }
        OFFSET #{offset}
        LIMIT #{limit}
      EOS

      query(sparql, endpoint: Endpoint.tg)
    end

    # 37,997 records (2017/9)
    def create_index!
      if client.indices.exists? index: index_name
        client.indices.delete index: index_name
      end

      body = {
        mappings: {
          mapping.to_hash.first[0] => mapping.to_hash.first[1]
        }
      }
      client.indices.create(index: index_name, body: body)

      limit = 1_000
      page  = 0

      c = 0
      loop do
        result = list(offset: limit * page, limit: limit)
        break if result.empty?

        result.each do |r|
          puts r
          next unless (name = r[:gene_name])

          data = {
            name:    name,
            tgid:    r[:togogenome].split('/').last,
            suggest: {
              input: name
            },
            output:  name
          }
          client.index(index: index_name,
                       type:  document_type,
                       body:  data)
        end

        Rails.logger.info("index: #{c += result.count}")
        page += 1
        break
      end
    end

    private

    def client
      __elasticsearch__.client
    end
  end
end
