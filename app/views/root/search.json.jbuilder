json.scroll do
  json.offset @param.offset
  json.limit @param.limit
end

json.statistics do
  json.total Variation.count(body: Elasticsearch::QueryBuilder.new.build.slice(:query))
  json.filtered @result[:filtered_total]

  if (stat = @result[:aggs]).present?
    json.dataset do
      Array(stat.dig(:frequency, :sources, :buckets)).each do |x|
        json.set! x[:key], x[:doc_count]
      end
      unless (c = stat.dig(:clinvar_total, :doc_count)).zero?
        json.clinvar c
      end
    end

    json.type do
      Array(@result[:aggs].dig(:types, :buckets)).each do |x|
        json.set! SequenceOntology.find_by_label(x[:key])&.id, x[:doc_count]
      end
    end

    json.significance do
      unless (c = @result[:filtered_total] - @result[:aggs].dig(:clinvar_total, :doc_count)).zero?
        json.NC c
      end
      Array(@result[:aggs].dig(:interpretations, :buckets)).each do |x|
        json.set! Form::ClinicalSignificance[x[:key]&.tr(' ', '_')&.to_sym]&.param_name, x[:doc_count]
      end
    end

    json.consequence do
      Array(@result[:aggs].dig(:vep, :consequences, :buckets)).each do |x|
        json.set! SequenceOntology.find_by_label(x[:key])&.id, x[:doc_count]
      end
    end
  end
end

json.data @result[:results] do |result|
  variation = result[:_source].deep_symbolize_keys

  json.id variation[:id].present? ? "tgv#{variation[:tgv_id]}" : nil

  json.type SequenceOntology.find_by_label(variation[:type])&.id

  json.chromosome variation.dig(:chromosome, :label)
  json.start variation[:start]
  json.stop variation[:stop]
  json.reference variation[:reference]
  json.alternative variation[:alternative]

  dbsnp = Array(variation[:xref]).filter { |x| x[:source] = 'dbSNP' }.map { |x| x[:id] }
  json.existing_variations dbsnp.presence

  json.symbols Array(variation[:vep])
                 .filter { |x| x.dig(:symbol, :source) == 'HGNC' && x[:hgnc_id] }
                 .map { |x| { name: x.dig(:symbol, :label), id: x[:hgnc_id] } }
                 .uniq
                 .map { |x| { name: x[:name], id: x[:id], synonyms: Gene.synonyms(x[:id]) }.compact }
                 .presence

  json.external_link do
    json.dbsnp dbsnp.presence
    json.clinvar variation.dig(:clinvar, :variation_id)
  end

  json.significance do
    interpretations = Array(variation.dig(:clinvar, :interpretation))
    json.interpretations interpretations.map { |x| Form::ClinicalSignificance[x.tr(' ', '_').to_sym]&.param_name }.presence
    json.condition Disease.find(*variation.dig(:clinvar, :medgen)).results.map { |x| x['_source'].slice('id', 'name') }.presence
  end

  vep = Array(variation[:vep])
  json.most_severe_consequence SequenceOntology.most_severe_consequence(*vep.flat_map { |x| x[:consequence] }.uniq)
  json.sift vep.map { |x| x[:sift] }.compact.min
  json.polyphen vep.map { |x| x[:polyphen] }.compact.max
  json.transcripts vep.presence

  json.frequencies Array(variation[:frequency]).presence
end

json.error @error if @error.present?
json.warning @warning if @warning.present?
json.notice @notice if @notice.present?
