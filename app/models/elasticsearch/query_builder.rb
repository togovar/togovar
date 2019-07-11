# frozen_string_literal: true

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
                        when /^(\d+|[XY]|MT):\d+(,(\d+|[XY]|MT):\d+)*$/
                          position_condition(term)
                        when /^(\d+|[XY]|MT):\d+-\d+(,(\d+|[XY]|MT):\d+-\d+)*$/
                          region_condition(term)
                        else
                          if (results = GeneSymbol.search(term).results).total.positive?
                            symbol = results.reject { |x| x.dig(:_source, :alias_of) }.map { |x| x.dig(:_source, :symbol) }.uniq
                            symbol_roots = results.map { |x| x.dig(:_source, :alias_of) }.compact
                            gene_condition(*symbol.concat(symbol_roots))
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
            should do
              if names.delete(:clinvar)
                nested do
                  path :conditions
                  query { exists { field :conditions } }
                end
              end
              if names.present?
                if names.size == 1
                  nested do
                    path :frequencies
                    query { match 'frequencies.source': names.first }
                  end
                else
                  nested do
                    path :frequencies
                    query { terms 'frequencies.source': names }
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
                  path :frequencies
                  query do
                    bool do
                      must { match 'frequencies.source': name }
                      if invert
                        must do
                          bool do
                            must_not do
                              range 'frequencies.frequency' do
                                gte frequency_from.to_f
                                lte frequency_to.to_f
                              end
                            end
                          end
                        end
                      else
                        must do
                          range 'frequencies.frequency' do
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

      datasets &= %i[jga_ngs hgvd tommo exac]

      return self if datasets.empty?

      @quality_condition = Elasticsearch::DSL::Search.search do
        query do
          nested do
            path :frequencies
            query do
              bool do
                must { terms 'frequencies.source': datasets }
                must { match 'frequencies.filter': 'PASS' }
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
          terms variant_type: keys
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
                    nested do
                      path :conditions
                      query { exists { field :conditions } }
                    end
                  end
                end
              end
            end

            interpretations = values.map { |x| Form::ClinicalSignificance.find_by_param_name(x).key }.compact

            break if interpretations.empty?

            should do
              nested do
                path :conditions
                query { terms 'conditions.interpretations': interpretations }
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
            path :transcripts
            query { terms 'transcripts.consequences': values }
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
            path :transcripts
            query do
              bool do
                values.each do |x|
                  should do
                    range 'transcripts.sift' do
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
            path :transcripts
            query do
              bool do
                values.each do |x|
                  should do
                    range 'transcripts.polyphen' do
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

      query.merge(aggregations)
    end

    def build
      conditions = []

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
      query[:sort] = %i[chromosome_sort start stop] if @sort

      query
    end

    private

    def aggregations
      query = Elasticsearch::DSL::Search.search do
        aggregation :aggs_frequencies do
          nested do
            path :frequencies
            aggregation :group_by_source do
              terms field: 'frequencies.source',
                    size: 5
            end
          end
        end
        aggregation :aggs_conditions do
          nested do
            path :conditions
            aggregation :group_by_interpretations do
              terms field: 'conditions.interpretations',
                    size: 15
            end
          end
        end
        aggregation :group_by_type do
          terms field: :variant_type,
                size: 5
        end
        aggregation :aggs_consequences do
          nested do
            path :transcripts
            aggregation :group_by_consequences do
              terms field: 'transcripts.consequences',
                    size: 40
            end
          end
        end
      end

      # add manually because dsl does not support nested-exists query
      total_clinvar = {
        aggregations: {
          total_clinvar: {
            filter: {
              nested: {
                path: 'conditions',
                query: {
                  exists: {
                    field: 'conditions'
                  }
                }
              }
            }
          }
        }
      }

      query.to_hash.deep_merge(total_clinvar)
    end

    def tgv_condition(term)
      id = term.split(/[\s,]/)

      query = Elasticsearch::DSL::Search.search do
        query do
          bool do
            id.each do |x|
              should do
                match tgv_id: x.sub(/^tgv/, '').to_i
              end
            end
          end
        end
      end

      query.to_hash[:query]
    end

    def rs_condition(term)
      id = term.split(/[\s,]/)

      query = Elasticsearch::DSL::Search.search do
        query do
          bool do
            id.each do |x|
              should do
                match existing_variations: x
              end
            end
          end
        end
      end

      query.to_hash[:query]
    end

    def position_condition(term)
      positions = term.split(/[\s,]/)
      start_only = @start_only

      query = Elasticsearch::DSL::Search.search do
        query do
          bool do
            positions.each do |x|
              chr, pos = x.split(':')
              should do
                bool do
                  must { match chromosome: chr }
                  if start_only
                    must { match start: pos.to_i }
                  else
                    must { range(:start) { lte pos.to_i } }
                    must { range(:stop) { gte pos.to_i } }
                  end
                end
              end
            end
          end
        end
      end.to_hash[:query]

      if query[:bool][:should].size == 1
        query[:bool][:should].first
      else
        query
      end
    end

    def region_condition(term)
      positions = term.split(/[\s,]/)

      query = Elasticsearch::DSL::Search.search do
        query do
          bool do
            positions.each do |x|
              chr, pos = x.split(':')
              start, stop = pos.split('-')
              should do
                bool do
                  must { match chromosome: chr }
                  must do
                    bool do
                      should do
                        range :start do
                          gte start.to_i
                          lte stop.to_i
                        end
                      end
                      should do
                        range :stop do
                          gte start.to_i
                          lte stop.to_i
                        end
                      end
                      should do
                        bool do
                          must do
                            range :start do
                              lte start.to_i
                            end
                          end
                          must do
                            range :stop do
                              gte stop.to_i
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
        end
      end

      query.to_hash[:query]
    end

    def gene_condition(*terms)
      query = Elasticsearch::DSL::Search.search do
        query do
          nested do
            path :transcripts
            query do
              terms 'transcripts.symbol': terms
            end
          end
        end
      end

      query.to_hash[:query]
    end

    def disease_condition(term)
      query = Elasticsearch::DSL::Search.search do
        query do
          nested do
            path :conditions
            query do
              match 'conditions.condition': term
            end
          end
        end
      end

      query.to_hash[:query]
    end
  end
end
