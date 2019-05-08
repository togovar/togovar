json.scroll do
  json.offset @param.offset
  json.limit @param.limit
  json.max_rows 10_000 # FIXME extract to config
end

if @result[:aggs].present?
  json.statistics do
    json.total Variant.total
    json.filtered @result[:filtered_total]

    json.dataset do
      Array(@result[:aggs].dig(:aggs_frequencies, :group_by_source, :buckets)).each do |x|
        json.set! x[:key].downcase.tr('-', '_'), x[:doc_count]
      end
      unless (c = @result[:aggs].dig(:total_clinvar, :doc_count)).zero?
        json.clinvar c
      end
    end

    json.type do
      Array(@result[:aggs].dig(:group_by_type, :buckets)).each do |x|
        json.set! x[:key], x[:doc_count]
      end
    end

    json.significance do
      unless (c = @result[:filtered_total] - @result[:aggs].dig(:total_clinvar, :doc_count)).zero?
        json.NC c
      end
      Array(@result[:aggs].dig(:aggs_conditions, :group_by_interpretations, :buckets)).each do |x|
        key = x[:key].downcase.tr(' ', '_').to_sym
        if (sig = Form::ClinicalSignificance[key])
          json.set! sig.param_name, x[:doc_count]
        else
          Rails.logger.warn("Not found `#{key}` in Form::ClinicalSignificance")
        end
      end
    end

    json.consequence do
      Array(@result[:aggs].dig(:aggs_consequences, :group_by_consequences, :buckets)).each do |x|
        json.set! x[:key], x[:doc_count]
      end
    end
  end
end

json.data @result[:hits] do |variant|
  source = variant[:_source].deep_symbolize_keys

  existing_variations = Array(source[:existing_variations]).map { |x| "rs#{x}" }
  symbols = Array(source[:transcripts])
              .select { |x| x[:symbol] && x[:symbol_source] == 'HGNC' && x[:hgnc_id] }
              .map { |x| { name: x[:symbol], id: x[:hgnc_id], synonyms: GeneSymbol.synonyms_for(x[:symbol]) } }
              .uniq

  frequencies = Array(source[:frequencies]).each do |x|
    x[:source] = x[:source].downcase.tr('-', '_')
    if x[:filter]
      x[:filter] = Array(x[:filter]).select { |y| y.casecmp('pass').zero? }.present? ? 'PASS' : nil
    end
  end

  sift = Array(source[:transcripts]).map { |x| x[:sift] }.compact.max
  polyphen = Array(source[:transcripts]).map { |x| x[:polyphen] }.compact.min

  conditions = Array(source[:conditions]).map do |x|
    x.slice(:condition, :vcv, :interpretations)
  end

  transcripts = Array(source[:transcripts])
  transcripts.each { |x| x.delete(:most_severe) }

  json.id "tgv#{source[:tgv_id]}"
  json.existing_variations(existing_variations)

  json.chromosome source[:chromosome]
  json.start source[:start]
  json.stop source[:stop]

  json.type source[:variant_type]
  json.reference source[:reference]
  json.alternative source[:alternative]

  json.symbols symbols

  json.most_severe_consequence source[:most_severe_consequence]
  json.sift sift
  json.polyphen polyphen

  json.significance conditions

  json.frequencies frequencies

  json.transcripts transcripts
end
