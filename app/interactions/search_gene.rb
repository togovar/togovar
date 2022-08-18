class SearchGene < ActiveInteraction::Base
  string :term

  validates :term, presence: true

  def execute
    query = {
      query: {
        match: {
          'symbol.ngram_search': term
        }
      },
      sort: %w[_score hgnc_id],
      highlight: {
        fields: {
          'symbol.ngram_search': {}
        }
      },
      size: 100
    }

    Gene.search(query).results.map do |r|
      {
        id: r.dig(:_source, :hgnc_id),
        symbol: r.dig(:_source, :symbol),
        name: r.dig(:_source, :name),
        alias_of: r.dig(:_source, :name),
        highlight: r.dig(:highlight, :'symbol.ngram_search')&.first
      }
    end
  end
end
