class Suggest
  extend ActiveModel::Naming

  include Suggest::Suggestable

  class << self
    def suggest(term)
      return nil if term.blank? || term.length < 3

      query = {
        query: {
          match: {
            label: term
          }
        }
      }

      result = client.search(index: index_name, body: query)
      result['hits']['hits'].map { |x| [x['_source']['label'], x['_type']] }
    end
  end

end
