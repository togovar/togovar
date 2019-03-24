class Disease
  module Elasticsearch
    include DiseaseSearchable
  end

  class << self
    # @param [String] term
    # @return [Elasticsearch::Model::Response] response
    def suggest(term)
      query = {
        size: 100,
        query: {
          bool: {
            must: [
              {
                multi_match: {
                  query: term,
                  fields: %w[term^10 term.simple^5 term.trigram]
                }
              }
            ]
          }
        }
      }

      Elasticsearch.search(query)
    end
  end
end
