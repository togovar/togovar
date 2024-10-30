# frozen_string_literal: true

class VariationSearchService
  class HtmlFormatter
    ALLELE_MAX_LENGTH = 4

    def initialize(param, result, **options)
      @param = param
      @result = result
      @options = options.dup
    end

    def to_hash
      JSON.parse(to_json.target!)
    end

    def to_json(*)
      Jbuilder.new do |json|
        data(json)
      end
    end

    private

    def id(result)
      return if (id = result[:id]).blank?

      %Q[<a href="/variant/tgv#{id}">tgv#{id}</a>]
    end

    def dbsnp(result)
      return if (items = Array(result[:xref]).filter_map { |x| x[:id] if x[:source] == 'dbSNP' }).blank?

      %Q[<a href="https://identifiers.org/dbsnp/#{items.first}">#{items.first}</a>]
        .tap { |x| x.concat %Q[<span class="badge">#{items.size - 1}+</span>] if items.size > 1 }
    end

    def position(result)
      chr = result.dig(:chromosome, :label)
      p = result.dig(:vcf, :position)

      case result[:type]
      when /SNV/i, /MNV/i, /Indel/i
        p
      when /Deletion/i, /Insertion/i
        p + 1
      else
        raise "Unknown type: #{result[:type]}"
      end

      %Q[<div class="chromosome-position"><div class="chromosome">#{chr}</div><div class="coordinate">#{p}</div></div>]
    end

    def ref_alt(result)
      ref = result[:reference] || ''
      alt = result[:alternate] || ''

      ref_size = ref.size
      alt_size = alt.size
      ref = ref_size > ALLELE_MAX_LENGTH ? "#{ref[0..3]}..." : ref
      alt = alt_size > ALLELE_MAX_LENGTH ? "#{alt[0..3]}..." : alt

      %Q[<div class="ref-alt"><span class="ref" data-sum="#{ref_size}">#{ref}</span><span class="arrow"></span><span class="alt" data-sum="#{alt_size}">#{alt}</span></div>]
    end

    def type(result)
      %Q[<div class="variant-type">#{result[:type]}</div>]
    end

    def symbols(result)
      gene = Array(result[:vep])
               .filter { |x| x.dig(:symbol, :source) == 'HGNC' && x[:hgnc_id] }
               .map { |x| { name: x.dig(:symbol, :label), id: x[:hgnc_id] } }
               .uniq

      return if gene.blank?

      %Q[<a href="/gene/#{gene.dig(0, :id)}" class="hyper-text -internal" target="_blank">#{gene.dig(0, :name)}</a>]
    end

    def frequency(value)
      return if value.blank?

      case
      when value == 0
        '0.0'
      when value == 1
        '1.0'
      when value < 0.001
        sprintf('%.3e', value)
      when value >= 0.001
        sprintf('%.3f', value)
      else
        nil
      end
    end

    def level(count, frequency)
      return 'na' if count.blank? || frequency.blank?

      case
      when count == 0
        'monomorphic'
      when count == 1
        'singleton'
      when frequency < 0.0001
        '<0.0001'
      when 0.0001 <= frequency && frequency < 0.001
        '<0.001'
      when 0.001 <= frequency && frequency < 0.01
        '<0.01'
      when 0.01 <= frequency && frequency < 0.05
        '<0.05'
      when 0.05 <= frequency && frequency < 0.5
        '<0.5'
      when 0.5 <= frequency
        '≥0.5'
      else
        'na'
      end
    end

    def frequencies(result)
      items = Variation.frequency_datasets(@options[:user]).map do |id|
        v = result.dig(:frequency)&.find { |x| x[:source] == id.to_s } || {}
        level = level(v[:ac], v[:af])

        %Q[<div class="dataset" data-dataset="#{id}" data-frequency="#{level}"></div>]
      end

      %Q[<div class="frequency-graph">#{items.join}</div>]
    end

    def consequence(result)
      return if (consequence = result[:most_severe_consequence]).blank?

      %Q[<div class="consequence-item">#{SequenceOntology.find_by_key(consequence)&.label}</div>]
    end

    def sift(result)
      return if (sift = Array(result[:vep]).map { |x| x[:sift] }.compact).blank?

      prediction = Sift.find_by_value(sift.min)

      %Q[<div class="sift"#{ %Q[ data-remains="#{sift.size - 1}"] if sift.size > 1 }><div class="variant-function" data-function="#{prediction&.key}">#{sift.min&.round(3)}</div></div>]
    end

    def polyphen(result)
      return if (polyphen = Array(result[:vep]).map { |x| x[:polyphen] }.compact).blank?

      prediction = Polyphen.find_by_value(polyphen.max)

      %Q[<div class="polyphen"#{ %Q[ data-remains="#{polyphen.size - 1}"] if polyphen.size > 1 }><div class="variant-function" data-function="#{prediction&.key}">#{polyphen.max&.round(3)}</div></div>]
    end

    def conditions
      @conditions ||= Hash.new do |hash, key|
        hash[key] = Disease.find(key).results.first&.dig('_source', 'name')
      end
    end

    def significance(result)
      return if (items = Array(result.dig(:clinvar, :conditions))).blank?
      return if (medgen = Array(items.first[:medgen]).first).blank?

      condition = Disease.find(medgen).results.first&.dig('_source', 'name') || CLINVAR_CONDITION_NOT_PROVIDED
      interpretation = items.first[:interpretation].first

      %Q[<div class="clinical_significance"#{ %Q[ data-remains="#{items.size - 1}"] if items.size > 1 }><div href="" class="clinical-significance" data-sign="#{interpretation}"></div><a>#{condition}</a></div>]
    end

    def data(json)
      json.array! @result[:results] do |result|
        r = result[:_source].deep_symbolize_keys
        json.id id(r)
        json.dbsnp dbsnp(r)
        json.position position(r)
        json.ref_alt ref_alt(r)
        json.type type(r)
        json.symbols symbols(r)
        json.frequencies frequencies(r)
        json.consequence consequence(r)
        json.sift sift(r)
        json.polyphen polyphen(r)
        json.significance significance(r)
      end
    end
  end
end
