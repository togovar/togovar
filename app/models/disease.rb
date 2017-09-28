class Disease
  include Queryable
  include Elasticsearch::Model
  include Elasticsearch::Model::Callbacks

  # define elasticsearch index and type for model
  index_name 'disease'
  document_type 'disease_suggest'

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
          disease_suggest: {
            text:       term,
            completion: {
              field: 'suggest'
            }
          }
        }
      }
      client.search(index: 'disease', type: document_type, body: query)['suggest']['disease_suggest'].first['options']
    end

    def list(offset: 0, limit: 1_000)
      sparql = <<-EOS.strip_heredoc
        DEFINE sql:select-option "order"
        PREFIX cv: <#{Endpoint.prefix.cv}>
        SELECT DISTINCT ?phenotype
        FROM <#{Endpoint.ontology.clinvar}> {
          ?submission cv:reportedPhenotypeInfo ?phenotype .
          FILTER ( ?phenotype NOT IN ("not provided", "not specified") )
        }
        OFFSET #{offset}
        LIMIT #{limit}
      EOS

      query(sparql)
    end

    def all_count
      sparql = <<-EOS.strip_heredoc
        DEFINE sql:select-option "order"
        PREFIX cv: <http://purl.jp/bio/10/clinvar/>
        SELECT COUNT(?variation) AS ?count
        FROM <http://togogenome.org/variation/clinvar> {
          ?variation a cv:Variant .
        }
      EOS

      query(sparql).first[:count].to_i
    end

    def filtered_count(label)
      sparql = <<-EOS.strip_heredoc
        DEFINE sql:select-option "order"
        PREFIX cv: <http://purl.jp/bio/10/clinvar/>
        SELECT COUNT(?variation) AS ?count
        FROM <http://togogenome.org/variation/clinvar> {
          ?submission cv:reportedPhenotypeInfo ?info .
          FILTER regex(?info, "#{label}", "i")
          ?variation cv:submission ?submission .
        }
      EOS

      query(sparql).first[:count].to_i
    end

    def all(offset: 0, limit: 1_000)
      sparql = <<-EOS.strip_heredoc
        DEFINE sql:select-option "order"
        PREFIX cv: <http://purl.jp/bio/10/clinvar/>
        SELECT ?variation GROUP_CONCAT(DISTINCT ?label ; SEPARATOR="\\n") AS ?location GROUP_CONCAT(DISTINCT ?info ; SEPARATOR="\\n") AS ?phenotype COUNT(DISTINCT ?submission) AS ?submission_num COUNT(DISTINCT ?allele) AS ?allele_num
        FROM <http://togogenome.org/variation/clinvar> {
          ?variation cv:submission ?submission ;
                     cv:allele ?allele .
          ?submission cv:reportedPhenotypeInfo ?info .
          ?allele rdfs:label ?label .
        } GROUP BY ?variation
        OFFSET #{offset}
        LIMIT #{limit}
      EOS

      query(sparql)
    end

    def search_by_disease(label, offset: 0, limit: 1_000)
      sparql = <<-EOS.strip_heredoc
        DEFINE sql:select-option "order"
        PREFIX cv: <http://purl.jp/bio/10/clinvar/>
        SELECT ?variation GROUP_CONCAT(DISTINCT ?label ; SEPARATOR="\\n") AS ?location MAX(?info) AS ?phenotype COUNT(DISTINCT ?submissions) AS ?submission_num COUNT(DISTINCT ?allele) AS ?allele_num
        FROM <http://togogenome.org/variation/clinvar> {
          ?submission cv:reportedPhenotypeInfo ?info .
          FILTER regex(?info, "#{label}", "i")
          ?variation cv:submission ?submission ;
                     cv:submission ?submissions ;
                     cv:allele ?allele .
          ?allele rdfs:label ?label .
        } GROUP BY ?variation
        OFFSET #{offset}
        LIMIT #{limit}
      EOS

      query(sparql)
    end

    # 9637 records (2017/9)
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
          next unless (name = r[:phenotype])

          data = {
            name: name
          }
          __elasticsearch__.client.index(index: index_name, type: document_type, body: data)
        end

        Rails.logger.info("index: #{c += result.count}")
        page += 1
      end
    end

    private

    def client
      __elasticsearch__.client
    end
  end

  def initialize(params)
    @params = params
  end

  def as_json(options = {})
    {
      recordsTotal:    (all = Disease.all_count),
      recordsFiltered: @params['term'].present? ? Disease.filtered_count(@params['term']) : all,
      data:            disease.as_json
    }
  end

  def disease
    @disease ||= if (term = @params['term']).present?
                   Disease.search_by_disease(term, offset: (page - 1) * per, limit: per)
                 else
                   Disease.all(offset: (page - 1) * per, limit: per)
                 end
  end

  def page
    @params['start'].to_i / per + 1
  end

  def per
    @params['length'].to_i.positive? ? @params['length'].to_i : 10
  end
end
