json.scroll do
  json.offset @param.offset
  json.limit @param.limit
  json.max_rows 10_000
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

synonyms = Hash.new { |hash, key| hash[key] = Gene.synonyms(key) }
conditions = Hash.new { |hash, key| hash[key] = Disease.find(key).results.first&.dig('_source', 'name') }

json.data @result[:results] do |result|
  variation = result[:_source].deep_symbolize_keys

  if (v = variation[:id]).present?
    json.id "tgv#{v}"
  end

  json.type SequenceOntology.find_by_label(variation[:type])&.id

  json.chromosome variation.dig(:chromosome, :label)
  json.start(case variation[:type]
             when 'SNV', 'Indel', 'MNV'
               variation[:start] + 1
             else
               variation[:start]
             end)
  json.stop variation[:stop]
  json.reference variation[:reference].presence || ''
  json.alternative variation[:alternative].presence || ''

  if (dbsnp = Array(variation[:xref]).filter { |x| x[:source] = 'dbSNP' }.map { |x| x[:id] }).present?
    json.existing_variations dbsnp
  end

  symbols = Array(variation[:vep])
              .filter { |x| x.dig(:symbol, :source) == 'HGNC' && x[:hgnc_id] }
              .map { |x| { name: x.dig(:symbol, :label), id: x[:hgnc_id] } }
              .uniq
              .map { |x| { name: x[:name], id: x[:id], synonyms: synonyms[x[:id]] }.compact }

  if symbols.present?
    json.symbols symbols
  end

  clinvar = (v = variation.dig(:clinvar, :variation_id)) ? ['VCV%09d' % v] : nil

  external_link = {
    dbsnp: dbsnp.presence,
    clinvar: clinvar
  }.compact

  if external_link.present?
    json.external_link external_link
  end

  interpretations = Array(variation.dig(:clinvar, :interpretation))
                      .map { |x| Form::ClinicalSignificance[x.tr(' ', '_').to_sym]&.param_name }

  significance = Array(variation.dig(:clinvar, :medgen))
                   .map.with_index { |x, i| x ? conditions[x] : variation.dig(:clinvar, :condition, i) }
                   .zip(interpretations)
                   .map { |a, b| { condition: a, interpretations: [b] } }

  if significance.present?
    json.significance significance
  end

  vep = Array(variation[:vep])
  json.most_severe_consequence SequenceOntology.most_severe_consequence(*vep.flat_map { |x| x[:consequence] }.uniq)
  json.sift vep.map { |x| x[:sift] }.compact.min
  json.polyphen vep.map { |x| x[:polyphen] }.compact.max
  vep.each do |x|
    x[:consequence] = x[:consequence].map { |y| SequenceOntology.find_by_label(y)&.id }
    x[:symbol] = if x[:symbol] && x.dig(:symbol, :source) == 'HGNC'
                   { source: x.dig(:symbol, :source), label: x.dig(:symbol, :label) }
                 end
  end
  json.transcripts vep.map(&:compact).presence

  json.frequencies Array(variation[:frequency]).map(&:compact).presence
end

json.error @error if @error.present?
json.warning @warning if @warning.present?
json.notice @notice if @notice.present?
