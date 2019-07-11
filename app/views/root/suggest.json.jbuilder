json.gene(@response[:gene].sort_by { |x| x[:_score] }.reverse_each) do |result|
  json.term result.dig(:_source, :symbol)
  if (a = result.dig(:_source, :alias_of))
    json.alias_of a
  end
end

json.disease(@response[:disease].sort_by { |x| x[:_score] }.reverse_each) do |result|
  json.term result.dig(:_source, :term)
end
