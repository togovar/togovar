class Gene
  include Queryable
  include Elasticsearch::Model
  include Elasticsearch::Model::Callbacks

  # define elasticsearch index and type for model
  index_name 'gene'
  document_type 'gene_suggest'

  # custom elasticsearch mapping per autocompletion
  mapping do
    indexes :name, type: 'string', copy_to: :suggest
    indexes :suggest, type: 'completion', analyzer: 'standard', search_analyzer: 'standard'
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
      sparql = gene_template.sub('%%TARGET%%', 'DISTINCT ?gene_name')
                 .sub('%%VALUES%%', '')
                 .sub('%%OFFSET%%', "OFFSET #{offset}")
                 .sub('%%LIMIT%%', "LIMIT #{limit}")

      query(sparql, endpoint: Endpoint.tg)
    end

    def all_count
      sparql = gene_template.sub('%%TARGET%%', 'COUNT (DISTINCT ?togogenome) AS ?count')
                 .sub('%%VALUES%%', '')
                 .sub('%%OFFSET%%', '')
                 .sub('%%LIMIT%%', '')

      query(sparql, endpoint: Endpoint.tg).first[:count].to_i
    end

    def search_by_gene(labels, offset: 0, limit: 1_000)
      labels = labels.nil? || labels.empty? ? nil : Array(labels)
      values = labels ? value_clause(labels) : ''

      sparql = gene_template.sub('%%TARGET%%', 'DISTINCT ?gene_name ?togogenome')
                 .sub('%%VALUES%%', values)
                 .sub('%%OFFSET%%', "OFFSET #{offset}")
                 .sub('%%LIMIT%%', "LIMIT #{limit}")

      query(sparql, endpoint: Endpoint.tg)
    end

    def value_clause(values)
      str = values.map { |v| "\"#{v}\"" }.join(' ')
      "VALUES ?gene_name { #{str} }"
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
          next unless (name = r[:gene_name])

          data = {
            name: name
          }
          client.index(index: index_name,
                       type:  document_type,
                       body:  data)
        end

        Rails.logger.info("index: #{c += result.count}")
        page += 1
      end
    end

    private

    def gene_template
      <<-EOS.strip_heredoc
        DEFINE sql:select-option "order"
        PREFIX insdc: <#{Endpoint.prefix.insdc}>
        PREFIX obo: <#{Endpoint.prefix.obo}>
        PREFIX idtax: <#{Endpoint.prefix.idtax}>
        SELECT %%TARGET%%
        WHERE {
          %%VALUES%%
          GRAPH <#{Endpoint.ontology.refseq}> {
            ?refseq_gene obo:RO_0002162 idtax:9606 ;
              rdf:type insdc:Gene ;
              rdfs:label ?gene_name .
          }
          GRAPH <#{Endpoint.ontology.tgup}> {
            ?togogenome skos:exactMatch ?refseq_gene .
          }
        }
        %%OFFSET%%
        %%LIMIT%%
      EOS
    end

    def client
      __elasticsearch__.client
    end
  end

  def initialize(params)
    @params = params
  end

  def as_json(options = {})
    {
      recordsTotal:    (all = Gene.all_count),
      recordsFiltered: @params['term'].present? ? Array(@params['term']).count : all,
      data:            genes.as_json
    }
  end

  def genes
    @genes ||= Gene.search_by_gene(@params['term'], offset: (page - 1) * per, limit: per)
  end

  def page
    @params['start'].to_i / per + 1
  end

  def per
    @params['length'].to_i.positive? ? @params['length'].to_i : 10
  end

end
