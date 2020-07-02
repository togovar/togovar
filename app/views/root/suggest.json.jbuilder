gene = @response[:gene].sort_by { |x| x[:_score] }.reverse
json.gene gene.map { |x| x['_source'] }.map { |x| [{ term: x['symbol'] }] + x['alias'].map { |y| { term: y['symbol'], alias_of: x['symbol'] } } }.flatten

disease = @response[:disease].sort_by { |x| x[:_score] }.reverse
json.disease(disease) do |x|
  json.term x.dig(:_source, :name)
end
