module Elasticsearch
  class QueryBuilder
    include Elasticsearch::DSL

    attr_accessor :from
    attr_accessor :size

    def initialize(**options)
      @from = 0
      @size = 100
      @sort = true
      @options = options
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

    def dataset(names, filter: true)
      @dataset_condition = nil

      return self if (names & Variation.all_datasets(@options[:user])).empty?

      query = Elasticsearch::DSL::Search.search do
        query do
          bool do
            if filter
              if (v = names & Variation.frequency_datasets(@options[:user], filter: true)).present?
                should do
                  nested do
                    path :frequency
                    query do
                      bool do
                        must do
                          terms 'frequency.source': v.map { |x| x == :jga_wes ? :jga_ngs : x } # TODO: remove if dataset renamed
                        end
                        must do
                          match 'frequency.filter': 'PASS'
                        end
                      end
                    end
                  end
                end
              end
              if (v = names & Variation.frequency_datasets(@options[:user], filter: false)).present?
                should do
                  nested do
                    path :frequency
                    query do
                      terms 'frequency.source': v.map { |x| x == :jga_wes ? :jga_ngs : x } # TODO: remove if dataset renamed
                    end
                  end
                end
              end
            else
              if (v = names & Variation.frequency_datasets(@options[:user])).present?
                should do
                  nested do
                    path :frequency
                    query do
                      terms 'frequency.source': v.map { |x| x == :jga_wes ? :jga_ngs : x } # TODO: remove if dataset renamed
                    end
                  end
                end
              end
            end

            if (v = names & Variation.condition_datasets(@options[:user])).present?
              should do
                nested do
                  path :conditions
                  query do
                    terms 'conditions.source': v
                  end
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

    def frequency(datasets, frequency_from, frequency_to, invert = false, all_datasets = false)
      @frequency_condition = nil

      sources = datasets & Variation.frequency_datasets(@options[:user])

      return self if sources.empty?

      @frequency_condition = Elasticsearch::DSL::Search.search do
        query do
          bool do
            sources.each do |source|
              # TODO: remove if dataset renamed
              source = :jga_ngs if source == :jga_wes

              send(all_datasets ? :must : :should) do
                nested do
                  path :frequency
                  query do
                    bool do
                      must { match 'frequency.source': source }
                      if invert
                        must do
                          bool do
                            must_not do
                              range 'frequency.af' do
                                gte frequency_from.to_f
                                lte frequency_to.to_f
                              end
                            end
                          end
                        end
                      else
                        must do
                          range 'frequency.af' do
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

      interpretations = values.filter_map { |x| ClinicalSignificance.find_by_key(x)&.label&.downcase.gsub(' ', '_') }

      return self if !values.include?(:NC) && interpretations.blank?

      @significance_condition = Elasticsearch::DSL::Search.search do
        query do
          bool do
            if values.include?(:NC)
              should do
                bool do
                  must_not do
                    exists field: :conditions
                  end
                end
              end
            end

            if interpretations.present?
              should do
                nested do
                  path 'conditions.condition'
                  query do
                    terms 'conditions.condition.classification': interpretations
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

      consequence = values.filter_map { |x| SequenceOntology.find(x)&.key }

      return self if consequence.empty?

      @consequence_condition = Elasticsearch::DSL::Search.search do
        query do
          nested do
            path :vep
            query do
              terms 'vep.consequence': consequence
            end
          end
        end
      end.to_hash[:query]

      self
    end

    def sift(*values)
      @sift_condition = nil

      values &= [:N, :D, :T]

      return self if values.empty?

      @sift_condition = Elasticsearch::DSL::Search.search do
        query do
          bool do
            values.each do |x|
              should do
                if x == :N
                  bool do
                    must_not do
                      exists do
                        field 'sift'
                      end
                    end
                  end
                else
                  range 'sift' do
                    if x == :D
                      lt 0.05
                    else
                      gte 0.05
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

      values &= [:N, :PROBD, :POSSD, :B, :U]

      return self if values.empty?

      @polyphen_condition = Elasticsearch::DSL::Search.search do
        query do
          bool do
            values.each do |x|
              should do
                if x == :N
                  bool do
                    must_not do
                      exists do
                        field 'polyphen'
                      end
                    end
                  end
                else
                  range 'polyphen' do
                    case x
                    when :B
                      gte 0
                      lte 0.446
                    when :POSSD
                      gt 0.446
                      lte 0.908
                    when :PROBD
                      gt 0.908
                    else
                      lt 0
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

    def alphamissense(*values)
      @alphamissense_condition = nil

      values &= [:N, :LP, :A, :LB]

      return self if values.empty?

      @alphamissense_condition = Elasticsearch::DSL::Search.search do
        query do
          bool do
            values.each do |x|
              should do
                if x == :N
                  bool do
                    must_not do
                      exists do
                        field 'alphamissense'
                      end
                    end
                  end
                else
                  range 'alphamissense' do
                    case x
                    when :LB
                      gte 0
                      lt 0.34
                    when :A
                      gte 0.34
                      lte 0.564
                    else
                      gt 0.564
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

      query.merge(Variation::QueryHelper.statistics(@options[:user]))
    end

    def build
      conditions = []

      conditions << default_condition
      conditions << @term_condition
      conditions << @dataset_condition
      conditions << @frequency_condition
      conditions << @type_condition
      conditions << @significance_condition
      conditions << @consequence_condition
      conditions << @sift_condition
      conditions << @polyphen_condition
      conditions << @alphamissense_condition

      conditions.compact!

      query = if conditions.size == 1
                { query: conditions.first }
              else
                { query: { bool: { must: conditions } } }
              end

      query[:size] = @size
      if @from.is_a?(Array)
        query[:search_after] = [@from[0].to_i, @from[1].to_i, @from[2].to_s, @from[3].to_s]
      else
        query[:from] = @from unless @from.zero?
      end
      query[:sort] = %w[chromosome.index vcf.position vcf.reference vcf.alternate] if @sort

      query
    end

    private

    def default_condition
      Variation.default_condition
    end

    def aggregations
      Elasticsearch::DSL::Search.search do
        aggregation :type do
          terms field: :type, size: Variation.cardinality[:types]
        end

        aggregation :vep do
          nested do
            path :vep
            aggregation :consequence do
              terms field: 'vep.consequence', size: Variation.cardinality[:vep_consequences]
            end
          end
        end

        aggregation :conditions_condition do
          nested do
            path 'conditions.condition'
            aggregation :classification do
              terms field: 'conditions.condition.classification',
                    size: Variation.cardinality[:condition_classifications]
            end
          end
        end

        aggregation :frequency do
          nested do
            path :frequency
            aggregation :source do
              terms field: 'frequency.source', size: Variation.cardinality[:frequency_sources]
            end
          end
        end

        aggregation :condition do
          nested do
            path :condition
            aggregation :source do
              terms field: 'conditions.source', size: Variation.cardinality[:condition_sources]
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
                          must { range(:start) { lte start.to_i } }
                          must { range(:stop) { gte stop.to_i } }
                        end
                      end
                      should do
                        bool do
                          must { range(:start) { gte start.to_i } }
                          must { range(:stop) { lte stop.to_i } }
                        end
                      end
                      should do
                        bool do
                          must { range(:start) { lte start.to_i } }
                          must do
                            range(:stop) do
                              gte start.to_i
                              lte stop.to_i
                            end
                          end
                        end
                      end
                      should do
                        bool do
                          must do
                            range(:start) do
                              gte start.to_i
                              lte stop.to_i
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
            path 'conditions.condition'
            query do
              terms 'conditions.condition.medgen': medgen
            end
          end
        end
      end

      query.to_hash[:query]
    end
  end
end
