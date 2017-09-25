class Disease
  include Queryable
  include Elasticsearch::Model
  include Elasticsearch::Model::Callbacks

  # define elasticsearch index and type for model
  index_name 'disease'
  document_type 'term'

  # custom elasticsearch mapping per autocompletion
  mapping do
    indexes :name, type: 'string'
    indexes :suggest, type:  'completion',
            analyzer:        'simple',
            search_analyzer: 'simple'
  end

  class << self
    # class method to execute autocomplete search
    def auto_complete(term)
      return nil if term.blank?

      query = {
        suggest: {
          text:       'cancer',
          completion: {
            field: 'suggest'
          }
        }
      }
      __elasticsearch__.client.suggest(index: 'disease', body: query)['suggest'].first['options']
    end

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

    def update_index!
      if __elasticsearch__.client.indices.exists? index: index_name
        __elasticsearch__.client.indices.delete index: index_name
      end

      body = {
        mappings: {
          mapping.to_hash.first[0] => mapping.to_hash.first[1]
        }
      }
      __elasticsearch__.client.indices.create(index: index_name, body: body)

      limit = 1_000
      page  = 0

      c = 0
      loop do
        result = list(offset: limit * page, limit: limit)
        break if result.empty?

        result.each do |r|
          next unless (name = r[:phenotype])

          data = {
            name:    name,
            cvid:    r[:cvid].split('/').last,
            suggest: {
              input: name.split(/\W+/)
            },
            output:  name
          }
          __elasticsearch__.client.index(index: index_name, type: document_type, body: data)
        end

        Rails.logger.info("index: #{c += result.count}")
        page += 1
      end
    end
  end
end
