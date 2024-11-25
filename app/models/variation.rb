class Variation
  include Variation::Searchable

  class << self
    def all_datasets(user, groups: false, filter: nil)
      frequency_datasets(user, groups:, filter:).concat(condition_datasets(user))
    end

    def frequency_datasets(user, groups: false, filter: nil)
      datasets = accessible_datasets(user)[:frequency]

      datasets.flat_map do |dataset|
        g = groups ? Array(dataset[:groups]).map { |x| x.is_a?(Hash) ? x[:id].to_sym : x.to_sym } : []

        [dataset[:id].to_sym].concat(g) if filter.nil? || dataset[:filter] == filter
      end.compact
    end

    def condition_datasets(user)
      datasets = accessible_datasets(user)[:condition]

      datasets.map { |x| x[:id].to_sym }
    end

    def accessible_datasets(user)
      authorized_datasets = Array((user || {})[:datasets]&.keys&.map(&:to_s))

      filter_hash(Rails.application.config.application[:datasets], authorized_datasets)
    end

    private

    def filter_hash(hash, values)
      return hash unless hash.is_a?(Hash)
      return if hash.key?(:authorization) && !values.include?(hash.dig(:authorization, :id))

      hash.each_with_object({}) do |(k, v), result|
        if v.is_a?(Array)
          arr = v.map { |x| filter_hash(x, values) }.compact
          result[k] = arr unless arr.blank?
        elsif v.is_a?(Hash)
          nested = filter_hash(v, values)
          result[k] = nested unless nested.blank?
        else
          result[k] = v
        end
      end
    end
  end

  module QueryHelper
    def total(user = {})
      query = Elasticsearch::DSL::Search.search do
        query do
          bool do
            should do
              nested do
                path :frequency
                query do
                  terms 'frequency.source': Variation.frequency_datasets(user)
                                                     .map { |x| x == :jga_wes ? :jga_ngs : x } # TODO: remove if dataset renamed
                end
              end
            end
            should do
              nested do
                path :conditions
                query do
                  terms 'conditions.source': Variation.condition_datasets(user)
                end
              end
            end
          end
        end
      end

      Variation.count(body: query)
    end

    def statistics(user = {})
      cardinality = Variation.cardinality

      Elasticsearch::DSL::Search.search do
        aggregation :type do
          terms field: :type,
                size: cardinality[:types]
        end

        aggregation :vep do
          nested do
            path :vep
            aggregation :consequence do
              terms field: 'vep.consequence',
                    size: cardinality[:vep_consequences]
            end
          end
        end

        aggregation :frequency do
          nested do
            path :frequency
            aggregation :source do
              terms field: 'frequency.source',
                    size: cardinality[:frequency_sources],
                    include: Variation.frequency_datasets(user)
                                      .map { |x| x == :jga_wes ? :jga_ngs : x } # TODO: remove if dataset renamed
            end
          end
        end

        aggregation :condition do
          nested do
            path 'conditions'
            aggregation :source do
              terms field: 'conditions.source',
                    size: cardinality[:condition_sources]
            end
          end
        end

        aggregation :conditions_condition do
          nested do
            path 'conditions.condition'
            aggregation :classification do
              terms field: 'conditions.condition.classification',
                    size: cardinality[:condition_classifications]
            end
          end
        end
      end
    end

    def count_conditions_absence(query)
      q = {
        nested: {
          path: 'conditions',
          query: {
            exists: {
              field: 'conditions'
            }
          }
        }
      }

      body = if query[:query].key?(:bool)
               {
                 query: {
                   bool: query[:query][:bool].merge(must_not: (query.dig(:query, :bool, :must_not) || []).concat([q]))
                 }
               }
             else
               {
                 query: {
                   bool: {
                     must_not: [q],
                     must: [query[:query]]
                   }
                 }
               }
             end

      Variation.count(body:)
    end

    module_function :total, :statistics, :count_conditions_absence
  end
end
