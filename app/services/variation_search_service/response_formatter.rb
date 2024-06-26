class VariationSearchService
  class ResponseFormatter
    XREF_TEMPLATE = Rails.application.config.application[:xref]

    def initialize(param, result, error = [], warning = [], notice = [])
      @param = param
      @result = result
      @error = error
      @warning = warning
      @notice = notice
    end

    def to_hash
      JSON.parse(to_json.target!)
    end

    def to_json(*)
      Jbuilder.new do |json|
        scroll(json)
        statistics(json)
        data(json)

        json.error @error if @error.present?
        json.warning @warning if @warning.present?
        json.notice @notice if @notice.present?
      end
    end

    private

    def scroll(json)
      json.scroll do
        json.offset @param[:offset] || 0
        json.limit @param[:limit] || 100
        json.max_rows 10_000
      end
    end

    def statistics(json)
      json.statistics do
        json.total Variation.count(body: Elasticsearch::QueryBuilder.new.build.slice(:query))
        json.filtered @result[:filtered_total]

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
        Array((stat = @result[:aggs]).dig(:frequency, :sources, :buckets)).each do |x|
          json.set! x[:key], x[:doc_count]
        end
        json.clinvar stat.dig(:clinvar_total, :doc_count)
      end
    end

    def type(json)
      json.type do
        Array(@result[:aggs].dig(:types, :buckets)).each do |x|
          json.set! SequenceOntology.find_by_label(x[:key])&.id, x[:doc_count]
        end
      end
    end

    def significance(json)
      json.significance do
        unless (c = @result[:filtered_total] - @result[:aggs].dig(:clinvar_total, :doc_count)).zero?
          json.set! 'NC', c
        end
        Array(@result[:aggs].dig(:conditions, :interpretations, :buckets)).each do |x|
          if (s = ClinicalSignificance.find_by_id(x[:key].tr(',', '').tr(' ', '_')))
            json.set! s.key, x[:doc_count]
          end
        end
      end
    end

    def consequence(json)
      json.consequence do
        Array(@result[:aggs].dig(:vep, :consequences, :buckets)).each do |x|
          if (c = SequenceOntology.find_by_key(x[:key]))
            json.set! c.id, x[:doc_count]
          end
        end
      end
    end

    CLINVAR_CONDITION_NOT_PROVIDED = 'not provided'

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
        if (id = variant.dig(:clinvar, :id)).present?
          external_link[:clinvar] = [{ title: 'VCV%09d' % id, xref: format(XREF_TEMPLATE[:clinvar], id: id) }]
        end
        if variant[:frequency]&.find { |x| x[:source] == 'tommo' }
          query = "#{variant.dig(:chromosome, :label)}:#{variant.dig(:vcf, :position)}"
          q = URI.encode_www_form(query: query)
          external_link[:tommo] = [{ title: query, xref: "#{XREF_TEMPLATE[:tommo]}?#{q}" }]
        end
        if variant[:frequency]&.find { |x| x[:source] =~ /^gnomad/ }
          vcf = variant[:vcf]
          id = "#{variant.dig(:chromosome, :label)}-#{vcf[:position]}-#{vcf[:reference]}-#{vcf[:alternate]}"
          external_link[:gnomad] = [{ title: id, xref: format(XREF_TEMPLATE[:gnomad], id: id) }]
        end

        if external_link.present?
          json.external_link external_link
        end

        significance = Array(variant.dig(:clinvar, :conditions)).map do |x|
          {
            conditions: Array(x[:medgen]).map { |v| { name: conditions[v] || CLINVAR_CONDITION_NOT_PROVIDED, medgen: v } },
            interpretations: Array(x[:interpretation]).filter_map { |y| ClinicalSignificance.find_by_id(y.tr(',', '').tr(' ', '_').to_sym)&.key },
            submission_count: x[:submission_count]
          }
        end

        if significance.present?
          significance.sort! do |a, b|
            if (r = ClinicalSignificance.find_by_key(a.dig(:interpretations, 0))&.index <=>
              ClinicalSignificance.find_by_key(b.dig(:interpretations, 0))&.index) && !r.zero?
              next r
            end

            if (r = b[:submission_count] <=> a[:submission_count]) && !r.zero?
              next r
            end

            next 1 if a[:condition] == CLINVAR_CONDITION_NOT_PROVIDED
            next -1 if b[:condition] == CLINVAR_CONDITION_NOT_PROVIDED

            if (r = b[:condition] <=> a[:condition]) && !r.zero?
              next r
            end

            a[:condition].blank? ? 1 : -1
          end

          json.significance significance
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
          next if !@param[:expand_dataset] && !Variation::Datasets::FREQUENCY.include?(x[:source].to_sym)

          if x[:af].blank? && x[:ac].present? && x[:an].present?
            x[:af] = Float(x[:ac]) / Float(x[:an])
          end

          if x[:af].blank? && x[:ac].present? && x[:an].present?
            x[:af] = Float(x[:ac]) / Float(x[:an])
          end

          an_hemi = x.delete(:an_hemi)
          if (ac_hemi = x.delete(:ac_hemi))
            x[:hemi_alt] = ac_hemi
            x[:hemi_ref] = an_hemi - ac_hemi if an_hemi
          end

          x.compact.sort.to_h
        end

        json.frequencies frequencies
      end
    end
  end
end
