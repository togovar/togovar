class SearchDisease < ActiveInteraction::Base
  string :term

  validates :term, presence: true

  def execute
    query = {
      collapse: {
        field: 'mondo'
      },
      query: {
        match: {
          'label.search': {
            query: term,
            fuzziness: 'AUTO',
            operator: 'AND'
          }
        }
      },
      sort: %w[_score mondo],
      highlight: {
        fields: {
          'label.search': {}
        }
      },
      size: 100
    }

    DiseaseMondo.search(query).results.map do |r|
      {
        id: r.dig(:_source, :mondo),
        cui: r.dig(:_source, :cui),
        label: r.dig(:_source, :label),
        highlight: r.dig(:highlight, :'label.search')&.first
      }
    end
  end
end
