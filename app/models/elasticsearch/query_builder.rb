# frozen_string_literal: true

module Elasticsearch
  class QueryBuilder
    include Elasticsearch::DSL

    attr_accessor :from
    attr_accessor :size

    # @param [Form::VariantSearchParameters] params
    def initialize
      @term = nil
      @dataset_conditions = []
      @for_all_datasets = false
      @type_conditions = []
      @significance_conditions = []
      @consequence_conditions = []
      @sift_conditions = []
      @polyphen_conditions = []
      @from = 0
      @size = 100
      @count_only = false
      @stat = true
    end

    def term(term)
      if term.blank?
        @term = nil
        return self
      end

      @term = case term.delete(' ')
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
                  symbol_root = results.first.dig(:_source, :alias_of)
                  gene_condition(symbol_root || results.first.dig(:_source, :symbol))
                else
                  disease_condition(term)
                end
              end
      self
    end

    def dataset(key, frequency_from = nil, frequency_to = nil, invert = false, filtered = false)
      query = Elasticsearch::DSL::Search.search do
        query do
          bool do
            must do
              nested do
                path :frequencies
                query do
                  bool do
                    must { match 'frequencies.source': key }
                    if filtered
                      must { regexp 'frequencies.filter': 'PASS|Passed' }
                    end
                    if frequency_from && frequency_to
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
      end

      @dataset_conditions.push query.to_hash[:query]

      self
    end

    def for_all_datasets(boolean)
      @for_all_datasets = !!boolean
      self
    end

    def count_only(boolean)
      @count_only = !!boolean
      self
    end

    def stat(boolean)
      @stat = !!boolean
      self
    end

    def type(*keys)
      query = Elasticsearch::DSL::Search.search do
        query do
          bool do
            keys.each do |x|
              should do
                match variant_type: x
              end
            end
          end
        end
      end

      @type_conditions.push query.to_hash[:query]

      self
    end

    def significance(*values)
      query = Elasticsearch::DSL::Search.search do
        query do
          bool do
            if values.include?('Not in ClinVar')
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
            values.each do |x|
              next if x == 'Not in ClinVar'

              should do
                nested do
                  path :conditions
                  query { match 'conditions.interpretations': x.downcase }
                end
              end
            end
          end
        end
      end

      @significance_conditions.push query.to_hash[:query]

      self
    end

    def consequence(*values)
      query = Elasticsearch::DSL::Search.search do
        query do
          bool do
            values.each do |x|
              should do
                nested do
                  path :transcripts
                  query { match 'transcripts.consequences': x }
                end
              end
            end
          end
        end
      end

      @consequence_conditions.push query.to_hash[:query]

      self
    end

    def sift(from, to)
      query = Elasticsearch::DSL::Search.search do
        query do
          should do
            nested do
              path :transcripts
              query do
                bool do
                  should do
                    range 'transcripts.sift' do
                      gte from.to_f
                      lte to.to_f
                    end
                  end
                end
              end
            end
          end
        end
      end

      @sift_conditions.push query.to_hash[:query]

      self
    end

    def polyphen(from, to)
      query = Elasticsearch::DSL::Search.search do
        query do
          should do
            nested do
              path :transcripts
              query do
                bool do
                  should do
                    range 'transcripts.polyphen' do
                      gte from.to_f
                      lte to.to_f
                    end
                  end
                end
              end
            end
          end
        end
      end

      @polyphen_conditions.push query.to_hash[:query]

      self
    end

    def build(statistics = true)
      conditions = []

      conditions << @term[:query] if @term

      unless @dataset_conditions.empty?
        conditions << if @for_all_datasets
                        { bool: { must: @dataset_conditions } }
                      else
                        { bool: { should: @dataset_conditions } }
                      end
      end

      unless @type_conditions.empty?
        merge = @type_conditions.inject([]) { |memo, obj| memo + obj.dig(:bool, :should) }
        conditions << { bool: { should: merge } }
      end

      unless @significance_conditions.empty?
        merge = @significance_conditions.inject([]) { |memo, obj| memo + obj.dig(:bool, :should) }
        conditions << { bool: { should: merge } }
      end

      unless @consequence_conditions.empty?
        merge = @consequence_conditions.inject([]) { |memo, obj| memo + obj.dig(:bool, :should) }
        conditions << { bool: { should: merge } }
      end

      unless @sift_conditions.empty?
        merge = @sift_conditions.inject([]) { |memo, obj| memo + obj.dig(:bool, :should) }
        conditions << { bool: { should: merge } }
      end

      unless @polyphen_conditions.empty?
        merge = @polyphen_conditions.inject([]) { |memo, obj| memo + obj.dig(:bool, :should) }
        conditions << { bool: { should: merge } }
      end

      query = if conditions.empty?
                default_scope
              else
                if @dataset_conditions.empty?
                  conditions << default_scope[:query] if @dataset_conditions.empty?
                end
                {
                  query: {
                    bool: {
                      must: conditions
                    }
                  }
                }
              end

      if @count_only
        query[:size] = 0
      else
        query[:size] = @size
        query[:from] = @from unless @from.zero?
        query[:sort] = %i[chromosome_sort start stop]
      end

      query.merge!(aggregations) if @stat

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

    def default_scope
      query = Elasticsearch::DSL::Search.search do
        query do
          bool do
            should do
              nested do
                path :frequencies
                query { exists { field :frequencies } }
              end
            end
            should do
              nested do
                path :conditions
                query { exists { field :conditions } }
              end
            end
          end
        end
      end

      query.to_hash
    end

    def tgv_condition(term)
      id = term.delete(' ').split(',')

      query = Elasticsearch::DSL::Search.search do
        query do
          bool do
            id.each do |x|
              should do
                match tgv_id: x
              end
            end
          end
        end
      end

      query.to_hash
    end

    def rs_condition(term)
      id = term.delete(' ').split(',')

      query = Elasticsearch::DSL::Search.search do
        query do
          bool do
            id.each do |x|
              should do
                match existing_variations: x.sub(/^rs/, '').to_i
              end
            end
          end
        end
      end

      query.to_hash
    end

    def position_condition(term)
      positions = term.delete(' ').split(',')

      query = Elasticsearch::DSL::Search.search do
        query do
          bool do
            positions.each do |x|
              chr, pos = x.split(':')
              should do
                bool do
                  must { match chromosome: chr }
                  must { range(:start) { lte pos.to_i } }
                  must { range(:stop) { gte pos.to_i } }
                end
              end
            end
          end
        end
      end

      query.to_hash
    end

    def region_condition(term)
      positions = term.delete(' ').split(',')

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
                      bool do
                        must { range(:start) { lte start.to_i } }
                        must { range(:stop) { gte stop.to_i } }
                      end
                    end
                  end
                end
              end
            end
          end
        end
      end

      query.to_hash
    end

    def gene_condition(term)
      query = Elasticsearch::DSL::Search.search do
        query do
          nested do
            path :transcripts
            query do
              match 'transcripts.symbol': term
            end
          end
        end
      end

      query.to_hash
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

      query.to_hash
    end
  end
end
