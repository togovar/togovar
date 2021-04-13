class VariationSearchService
  # @deprecated This class remains only for backwards compatibility
  class ResponseFormatter
    def initialize(param, result, error = [], warning = [], notice = [])
      @param = param
      @result = result
      @error = error
      @warning = warning
      @notice = notice
    end

    def format
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
        unless (c = stat.dig(:clinvar_total, :doc_count)).zero?
          json.clinvar c
        end
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
        Array(@result[:aggs].dig(:interpretations, :buckets)).each do |x|
          if (s = Form::ClinicalSignificance[x[:key].tr(' ', '_').to_sym])
            json.set! s.param_name, x[:doc_count]
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

    def data(json)
      synonyms = Hash.new { |hash, key| hash[key] = Gene.synonyms(key) }
      conditions = Hash.new { |hash, key| hash[key] = Disease.find(key).results.first&.dig('_source', 'name') }

      json.data @result[:results] do |result|
        variation = result[:_source].deep_symbolize_keys

        if (v = variation[:id]).present?
          json.id "tgv#{v}"
        end

        json.type SequenceOntology.find_by_label(variation[:type])&.id

        json.chromosome variation.dig(:chromosome, :label)
        json.start variation[:start]
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
        json.most_severe_consequence SequenceOntology.most_severe_consequence(*vep.flat_map { |x| x[:consequence] })&.id
        json.sift vep.map { |x| x[:sift] }.compact.min
        json.polyphen vep.map { |x| x[:polyphen] }.compact.max
        vep.each do |x|
          x[:consequence] = x[:consequence].map { |y| SequenceOntology.find_by_key(y)&.id }
        end
        json.transcripts vep.map(&:compact).presence

        json.frequencies Array(variation[:frequency]).map(&:compact).presence
      end
    end
  end
end
