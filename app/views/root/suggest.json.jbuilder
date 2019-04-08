json.data do
  json.gene @response[:gene] do |result|
    json.symbol result.dig(:_source, :symbol)
    if (a = result.dig(:_source, :alias_of))
      json.alias_of a
    end
  end

  json.disease @response[:disease] do |result|
    json.name result.dig(:_source, :term)
  end
end
