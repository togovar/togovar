module Elasticsearch
  class QueryBuilder
    include Elasticsearch::DSL

    attr_accessor :from
    attr_accessor :size
    attr_accessor :start_only

    def initialize
      @from = 0
      @size = 100
      @sort = true
      @start_only = false
    end

    def term(term)
      @term_condition = nil

      return self if term.blank?

      @term_condition = case term.delete(' ')
                        when /^tgv\d+(,tgv\d+)*$/
                          tgv_condition(term)
                        when /^rs\d+(,rs\d+)*$/i
                          rs_condition(term)
                        when /^(\d+|[XY]|MT):\d+:(\w+)>(\w+)(,(\d+|[XY]|MT):\d+:(\w+)>(\w+))*$/
                          position_allele_condition(term)
                        when /^(\d+|[XY]|MT):\d+(:[^,]+)?(,(\d+|[XY]|MT):\d+(:[^,]+)?)*$/
                          position_condition(term)
                        when /^(\d+|[XY]|MT):\d+-\d+(:[^,]+)?(,(\d+|[XY]|MT):\d+-\d+(:[^,]+)?)*$/
                          region_condition(term)
                        else
                          if (t = Gene.exact_match(term))
                            gene_condition(t)
                          else
                            disease_condition(term)
                          end
                        end

      self
    end

    def dataset(names)
      @dataset_condition = []

      return self if names.empty?

      names = names.dup

      query = Elasticsearch::DSL::Search.search do
        query do
          bool do
            if names.delete(:clinvar)
              should do
                exists field: :clinvar
              end
            end
            if names.present?
              should do
                nested do
                  path :frequency
                  query { terms 'frequency.source': names }
                end
              end
            end
          end
        end
      end.to_hash[:query]

      @dataset_condition = if query[:bool][:should].size == 1
                             query[:bool][:should].first
                           else
                             query
                           end

      self
    end

    def frequency(datasets, frequency_from, frequency_to, invert, all_datasets)
      @frequency_condition = nil
      names = datasets.dup
      names.delete(:clinvar)

      return self if names.empty?

      @frequency_condition = Elasticsearch::DSL::Search.search do
        query do
          bool do
            names.each do |name|
              send(all_datasets ? :must : :should) do
                nested do
                  path :frequency
                  query do
                    bool do
                      must { match 'frequency.source': name }
                      if invert
                        must do
                          bool do
                            must_not do
                              range 'frequency.allele.frequency' do
                                gte frequency_from.to_f
                                lte frequency_to.to_f
                              end
                            end
                          end
                        end
                      else
                        must do
                          range 'frequency.allele.frequency' do
                            gte frequency_from.to_f
                            lte frequency_to.to_f
                          end
                        end
                      end
                    end
                  end
                end
              end
            end
          end
        end
      end.to_hash[:query]

      self
    end

    def quality(datasets)
      @quality_condition = nil

      filter_sources = datasets & %i[gem_j_wga jga_ngs jga_snp tommo gnomad_exomes gnomad_genomes]

      return self if filter_sources.empty?

      @quality_condition = Elasticsearch::DSL::Search.search do
        query do
          bool do
            if datasets.include?(:clinvar)
              should do
                bool do
                  must_not do
                    nested do
                      path :frequency
                      query do
                        exists field: 'frequency'
                      end
                    end
                  end
                end
              end
            end
            if (x = (datasets & %i[hgvd])).present?
              should do
                nested do
                  path :frequency
                  query do
                    terms 'frequency.source': x
                  end
                end
              end
            end
            should do
              nested do
                path :frequency
                query do
                  bool do
                    must do
                      terms 'frequency.source': filter_sources
                    end
                    must do
                      match 'frequency.filter': 'PASS'
                    end
                  end
                end
              end
            end
          end
        end
      end.to_hash[:query]

      self
    end

    def type(*keys)
      @type_condition = nil

      return self if keys.empty?

      @type_condition = Elasticsearch::DSL::Search.search do
        query do
          terms type: keys.map { |x| SequenceOntology.find(x)&.label }.compact
        end
      end.to_hash[:query]

      self
    end

    def significance(*values)
      @significance_condition = nil

      return self if values.empty?

      values = values.dup

      @significance_condition = Elasticsearch::DSL::Search.search do
        query do
          bool do
            if values.delete(:NC)
              should do
                bool do
                  must_not do
                    exists field: :clinvar
                  end
                end
              end
            end

            if (interpretations = values.filter_map { |x| Form::ClinicalSignificance.find_by_param_name(x)&.label&.downcase }).present?
              should do
                nested do
                  path 'clinvar.conditions'
                  query do
                    terms 'clinvar.conditions.interpretation': interpretations
                  end
                end
              end
            end
          end
        end
      end.to_hash[:query]

      self
    end

    def consequence(*values)
      @consequence_condition = nil

      return self if values.empty?

      @consequence_condition = Elasticsearch::DSL::Search.search do
        query do
          nested do
            path :vep
            query do
              terms 'vep.consequence': values.map { |x| SequenceOntology.find(x)&.key }.compact
            end
          end
        end
      end.to_hash[:query]

      self
    end

    def sift(*values)
      @sift_condition = nil

      return self if values.empty?

      @sift_condition = Elasticsearch::DSL::Search.search do
        query do
          nested do
            path :vep
            query do
              bool do
                values.each do |x|
                  should do
                    range 'vep.sift' do
                      if x == :D
                        lt 0.05
                      elsif x == :T
                        gte 0.05
                      end
                    end
                  end
                end
              end
            end
          end
        end
      end.to_hash[:query]

      self
    end

    def polyphen(*values)
      @polyphen_condition = nil

      values &= [:PROBD, :POSSD, :B]

      return self if values.empty?

      @polyphen_condition = Elasticsearch::DSL::Search.search do
        query do
          nested do
            path :vep
            query do
              bool do
                values.each do |x|
                  should do
                    range 'vep.polyphen' do
                      if x == :PROBD
                        gt 0.908
                      elsif x == :POSSD
                        gt 0.446
                        lte 0.908
                      elsif x == :B
                        lte 0.446
                      end
                    end
                  end
                end
              end
            end
          end
        end
      end.to_hash[:query]

      self
    end

    def limit(size)
      @size = size
      self
    end

    def sort(bool)
      @sort = !!bool
      self
    end

    def stat_query
      query = build

      query[:size] = 0
      query.delete(:from)
      query.delete(:sort)

      query.merge(Variation::QueryHelper.statistics)
    end

    def build
      conditions = []

      conditions << default_condition
      conditions << @term_condition
      conditions << @dataset_condition
      conditions << @frequency_condition
      conditions << @quality_condition
      conditions << @type_condition
      conditions << @significance_condition
      conditions << @consequence_condition
      conditions << @sift_condition
      conditions << @polyphen_condition

      conditions.compact!

      query = if conditions.size == 1
                { query: conditions.first }
              else
                { query: { bool: { must: conditions } } }
              end

      query[:size] = @size
      query[:from] = @from unless @from.zero?
      query[:sort] = %w[chromosome.index vcf.position vcf.reference vcf.alternate] if @sort

      query
    end

    private

    def default_condition
      Elasticsearch::DSL::Search.search do
        query do
          exists field: :type
        end
      end.to_hash[:query]
    end

    def aggregations
      Elasticsearch::DSL::Search.search do
        aggregation :types do
          terms field: :type, size: Variation.cardinality[:types]
        end

        aggregation :vep do
          nested do
            path :vep
            aggregation :consequences do
              terms field: 'vep.consequence', size: Variation.cardinality[:vep_consequences]
            end
          end
        end

        aggregation :clinvar_total do
          filter exists: { field: :clinvar }
        end

        aggregation :conditions do
          nested do
            path 'clinvar.conditions'
            aggregation :interpretations do
              terms field: 'clinvar.conditions.interpretation',
                    size: Variation.cardinality[:clinvar_interpretations]
            end
          end
        end


        aggregation :frequency do
          nested do
            path :frequency
            aggregation :sources do
              terms field: 'frequency.source', size: Variation.cardinality[:frequency_sources]
            end
          end
        end
      end
    end

    def tgv_condition(term)
      id = term.split(/[\s,]/)

      query = Elasticsearch::DSL::Search.search do
        query do
          terms id: id.map { |x| x.sub(/^tgv/, '').to_i }
        end
      end

      query.to_hash[:query]
    end

    def rs_condition(term)
      id = term.split(/[\s,]/)

      query = Elasticsearch::DSL::Search.search do
        query do
          nested do
            path :xref
            query do
              bool do
                must do
                  match 'xref.source': 'dbSNP'
                end
                must do
                  terms 'xref.id': id
                end
              end
            end
          end
        end
      end

      query.to_hash[:query]
    end

    def position_condition(term)
      positions = term.split(/[\s,]/)

      region_condition(positions.map { |p| chr, pos = p.split(':'); "#{chr}:#{pos}-#{pos}" }.join(','))
    end

    def position_allele_condition(term)
      positions = term.split(/[\s,]/)

      region_condition(positions.map { |p| chr, pos, allele = p.split(':'); "#{chr}:#{pos}-#{pos}:#{allele}" }.join(','))
    end

    def region_condition(term)
      positions = term.split(/[\s,]/)

      query = Elasticsearch::DSL::Search.search do
        query do
          bool do
            positions.each do |x|
              chr, pos, allele = x.split(':')
              start, stop = pos.split('-')
              should do
                bool do
                  must { match 'chromosome.label': chr }
                  if allele.present?
                    ref, alt = allele.split('>')
                    must { match reference: ref } if ref.present?
                    must { match alternate: alt } if alt.present?
                  end
                  must do
                    bool do
                      should do
                        bool do
                          must { range(:start) { lte start.to_i - 1 } }
                          must { range(:stop) { gte stop.to_i } }
                        end
                      end
                      should do
                        bool do
                          must { range(:start) { gte start.to_i - 1 } }
                          must { range(:stop) { lt stop.to_i } }
                        end
                      end
                      should do
                        bool do
                          must { range(:start) { lt start.to_i - 1 } }
                          must do
                            range(:stop) do
                              gt start.to_i - 1
                              lte stop.to_i
                            end
                          end
                        end
                      end
                      should do
                        bool do
                          must do
                            range(:start) do
                              gte start.to_i - 1
                              lt stop.to_i
                            end
                          end
                          must { range(:stop) { gt start.to_i } }
                        end
                      end
                    end
                  end
                end
              end
            end
          end
        end
      end

      query.to_hash[:query]
    end

    def gene_condition(term)
      query = Elasticsearch::DSL::Search.search do
        query do
          nested do
            path :'vep.symbol'
            query do
              bool do
                must do
                  match 'vep.symbol.source': 'HGNC'
                end
                must do
                  terms 'vep.symbol.label': [term]
                end
              end
            end
          end
        end
      end

      query.to_hash[:query]
    end

    def disease_condition(term)
      medgen = if (t = Disease.exact_match(term)).present?
                 [t[:id]]
               elsif (ts = Disease.condition_search(term)).present?
                 ts.map(&:id)
               end

      return if medgen.blank?

      query = Elasticsearch::DSL::Search.search do
        query do
          nested do
            path 'clinvar.conditions'
            query do
              terms 'clinvar.conditions.medgen': medgen
            end
          end
        end
      end

      query.to_hash[:query]
    end
  end
end
