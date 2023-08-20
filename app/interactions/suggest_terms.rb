class SuggestTerms < ActiveInteraction::Base
  string :term

  validates :term, length: { minimum: 3 }

  def execute
    gene = Gene.suggest(term).sort_by { |x| x[:_score] }.reverse
    disease = Disease.suggest(term).sort_by { |x| x[:_score] }.reverse

    {
      gene: gene.map { |x| { term: x.dig('_source', 'symbol'), alias_of: x.dig('_source', 'alias_of') } },
      disease: disease.map { |x| { term: x.dig(:_source, :name) } }
    }
  end
end
