class VariationSearchService
  class ResponseFormatter
    XREF_TEMPLATE = Rails.application.config.application[:xref]

    def initialize(param, result, error = [], warning = [], notice = [], **options)
      @param = param
      @result = result.deep_symbolize_keys
      @error = error
      @warning = warning
      @notice = notice
      @options = options.dup
    end

    def to_hash
      JSON.parse(to_json.target!)
    end

    def to_json(*)
      Jbuilder.new do |json|
        scroll(json)
        statistics(json) if @result[:aggs]
        data(json) if @result[:results]

        json.error @error if @error.present?
        json.warning @warning if @warning.present?
        json.notice @notice if @notice.present?
      end
    end

    private

    def accessible_datasets
      @accessible_datasets ||= Variation.all_datasets(@options[:user], groups: @param[:expand_dataset])
    end

    def scroll(json)
      json.scroll do
        json.offset @param[:offset] || 0
        json.limit @param[:limit] || 100
        json.max_rows 10_000
      end
    end

    def statistics(json)
      json.statistics do
        json.total @result[:total]
        json.filtered @result[:filtered]

        if @result[:aggs].present?
          dataset(json)
          type(json)
          significance(json)
          consequence(json)
        end
      end
    end

    def dataset(json)
      json.dataset do
        aggs = @result[:aggs]
        datasets = Array(aggs.dig(:frequency, :source, :buckets)).concat(Array(aggs.dig(:condition, :source, :buckets)))

        datasets.each do |x|
          # TODO: remove if dataset renamed
          key = x[:key] == 'jga_ngs' ? 'jga_wes' : x[:key]

          json.set! key, x[:doc_count] if accessible_datasets.include?(key.to_sym)
        end
      end
    end

    def type(json)
      json.type do
        Array(@result[:aggs].dig(:type, :buckets)).each do |x|
          json.set! SequenceOntology.find_by_label(x[:key])&.id, x[:doc_count]
        end
      end
    end

    def significance(json)
      json.significance do
        unless (c = @result[:count_condition_absence]).zero?
          json.set! 'NC', c
        end
        Array(@result[:aggs].dig(:conditions_condition, :classification, :buckets)).each do |x|
          if (s = ClinicalSignificance.find_by_id(x[:key].tr(',', '').tr(' ', '_')))
            json.set! s.key, x[:doc_count]
          end
        end
      end
    end

    def consequence(json)
      json.consequence do
        Array(@result[:aggs].dig(:vep, :consequence, :buckets)).each do |x|
          if (c = SequenceOntology.find_by_key(x[:key]))
            json.set! c.id, x[:doc_count]
          end
        end
      end
    end

    CLINVAR_CONDITION_NOT_PROVIDED = 'not provided'

    # C3661900 = not provided
    # CN169374 = not specified
    MEDGEN_IGNORE = %w[C3661900 CN169374]

    MEDGEN_COMPARATOR = proc do |a, b|
      next MEDGEN_IGNORE.find_index(a) <=> MEDGEN_IGNORE.find_index(b) if [a, b].all? { |x| MEDGEN_IGNORE.include?(x) }
      next 1 if MEDGEN_IGNORE.include?(a)
      next -1 if MEDGEN_IGNORE.include?(b)
      0
    end

    CONDITIONS_COMPARATOR = proc do |a, b|
      if (r = ClinicalSignificance.find_by_key(a.dig(:interpretations, 0))&.index <=>
        ClinicalSignificance.find_by_key(b.dig(:interpretations, 0))&.index) && !r.zero?
        next r
      end

      if (r = b[:submission_count] <=> a[:submission_count]) && !r.zero?
        next r
      end

      m1 = a.dig(:conditions, 0, :medgen)
      m2 = b.dig(:conditions, 0, :medgen)
      next MEDGEN_IGNORE.find_index(m1) <=> MEDGEN_IGNORE.find_index(m2) if [m1, m2].all? { |x| MEDGEN_IGNORE.include?(x) }
      next 1 if m1.present? && MEDGEN_IGNORE.include?(m1)
      next -1 if m2.present? && MEDGEN_IGNORE.include?(m2)

      b[:conditions]&.filter_map { |x| x[:medgen] }&.flatten&.size <=> a[:conditions]&.filter_map { |x| x[:medgen] }&.flatten&.size || 0
    end

    def data(json)
      synonyms = Hash.new { |hash, key| hash[key] = Gene.synonyms(key) }
      conditions = Hash.new { |hash, key| hash[key] = Disease.find(key).results.first&.dig('_source', 'name') }

      json.data @result[:results] do |result|
        variant = result[:_source].deep_symbolize_keys

        if (tgv = variant[:id]).present?
          json.id "tgv#{tgv}"
        end

        json.type SequenceOntology.find_by_label(variant[:type])&.id

        json.chromosome variant.dig(:chromosome, :label)
        json.position variant.dig(:vcf, :position)
        json.start variant[:start]
        json.stop variant[:stop]
        json.reference variant[:reference].presence || ''
        json.alternate variant[:alternate].presence || ''
        vcf = {
          position: variant.dig(:vcf, :position),
          reference: variant.dig(:vcf, :reference),
          alternate: variant.dig(:vcf, :alternate)
        }
        json.vcf vcf

        if (dbsnp = Array(variant[:xref]).filter { |x| x[:source] = 'dbSNP' }.map { |x| x[:id] }).present?
          json.existing_variations dbsnp
        end

        symbols = Array(variant[:vep])
                    .filter { |x| x.dig(:symbol, :source) == 'HGNC' && x[:hgnc_id] }
                    .map { |x| { name: x.dig(:symbol, :label), id: x[:hgnc_id] } }
                    .uniq
                    .map { |x| { name: x[:name], id: x[:id], synonyms: synonyms[x[:id]] }.compact }

        if symbols.present?
          json.symbols symbols
        end

        external_link = {}
        if dbsnp.present?
          external_link[:dbsnp] = dbsnp.map { |x| { title: x, xref: format(XREF_TEMPLATE[:dbsnp], id: x) } }
        end
        if (id = variant[:conditions]&.find { |x| x[:source] == 'clinvar' }&.dig(:id)).present?
          external_link[:clinvar] = [{ title: 'VCV%09d' % id, xref: format(XREF_TEMPLATE[:clinvar], id: id) }]
        end
        if (id = variant[:conditions]&.find { |x| x[:source] == 'mgend' }&.dig(:id)).present?
          external_link[:mgend] = [{ title: id, xref: format(XREF_TEMPLATE[:mgend], id: id) }]
        end
        if variant[:frequency]&.find { |x| x[:source] == 'tommo' }
          query = "#{variant.dig(:chromosome, :label)}:#{variant.dig(:vcf, :position)}"
          q = URI.encode_www_form(query: query)
          external_link[:tommo] = [{ title: query, xref: "#{XREF_TEMPLATE[:tommo]}?#{q}" }]
        end
        if variant[:frequency]&.find { |x| x[:source] =~ /^gnomad/ }
          id = "#{variant.dig(:chromosome, :label)}-#{vcf[:position]}-#{vcf[:reference]}-#{vcf[:alternate]}"
          external_link[:gnomad] = [{ title: id, xref: format(XREF_TEMPLATE[:gnomad], id: id) }]
        end

        if external_link.present?
          json.external_link external_link
        end

        significance = Array(variant[:conditions]).flat_map do |condition|
          # TODO: remove on 2025.1
          if condition[:source] == "mgend" && condition[:condition].blank?
            if (f = Rails.root.join('tmp', 'mgend.vcf.gz')).exist? &&
              (r = `zgrep '#{condition[:id]}' #{f}`).present? &&
              (info = r.split("\n").first.split("\t")[7]).present? &&
              (cond = info.match(/CONDITIONS=([^;]+)/)&.captures[0])

              condition[:condition] = cond.split("|").filter_map do |x|
                next if (cs = x.split(":")[2]).blank?

                { classification: [cs.downcase.gsub(',', '').gsub(' ', '_')] }
              end
            end
          end

          (condition[:condition].presence || [{}]).map do |x|
            {
              conditions: if x[:medgen].present?
                            Array(x[:medgen]).sort(&MEDGEN_COMPARATOR)
                                             .map { |v| { name: conditions[v] || CLINVAR_CONDITION_NOT_PROVIDED, medgen: v } }
                          elsif x[:pref_name].present?
                            Array(x[:pref_name]).map { |v| { name: v } }
                          else
                            []
                          end,
              interpretations: Array(x[:classification]).filter_map { |y| ClinicalSignificance.find_by_id(y.tr(',', '').tr(' ', '_').to_sym)&.key },
              submission_count: x[:submission_count],
              source: condition[:source]
            }
          end
        end

        if significance.present?
          json.significance significance.sort(&CONDITIONS_COMPARATOR)
        end

        vep = Array(variant[:vep])
        json.most_severe_consequence SequenceOntology.most_severe_consequence(*vep.flat_map { |x| x[:consequence] })&.id
        json.sift variant[:sift]
        json.polyphen variant[:polyphen]&.negative? ? 'Unknown' : variant[:polyphen]
        json.alphamissense variant[:alphamissense]
        vep.each do |x|
          consequences = x[:consequence].map { |key| SequenceOntology.find_by_key(key) }
          x[:consequence] = (SequenceOntology::CONSEQUENCES_IN_ORDER & consequences).map { |y| y.id }
        end
        json.transcripts vep.map(&:compact).presence

        frequencies = Array(variant[:frequency]).filter_map do |x|
          # TODO: remove if dataset renamed
          x[:source] = 'jga_wes' if x[:source] == 'jga_ngs'
          if (m = x[:source].match(/^(bbj_riken\.mpheno\d+)\.all$/))
            x[:source] = m[1]
          end

          next unless accessible_datasets.include?(x[:source].to_sym)

          if x[:af].blank? && x[:ac].present? && x[:an].present?
            x[:af] = Float(x[:ac]) / Float(x[:an])
          end

          x.compact.sort.to_h
        end

        json.frequencies frequencies
      end
    end
  end
end
