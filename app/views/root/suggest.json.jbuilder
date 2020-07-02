gene = @response[:gene].sort_by { |x| x[:_score] }.reverse
json.gene gene.map { |x| { term: x.dig('_source', 'symbol'), alias_of: x.dig('_source', 'alias_of') } }

disease = @response[:disease].sort_by { |x| x[:_score] }.reverse
json.disease(disease) do |x|
  json.term x.dig(:_source, :name)
end
