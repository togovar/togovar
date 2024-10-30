class Variation
  include Variation::Searchable

  class << self
    def all_datasets(user, groups: false)
      datasets = accessible_datasets(user).values

      datasets.map { |x| x.flat_map { |y| [y[:id]].concat(Array(groups ? y[:groups] : nil)) } }
              .flatten
              .map(&:to_sym)
    end

    def frequency_datasets(user, groups: false, filter: nil)
      datasets = accessible_datasets(user)[:frequency]

      datasets.filter_map { |x| [x[:id]].concat(Array(groups ? x[:groups] : nil)) if filter.nil? || x[:filter] == filter }
              .flatten
              .map(&:to_sym)
    end

    def condition_datasets(user)
      datasets = accessible_datasets(user)[:condition]

      datasets.map { |x| x[:id].to_sym }
    end

    def accessible_datasets(user)
      authorized_datasets = Array((user || {})[:datasets]&.keys&.map(&:to_s))

      Rails.application.config.application[:datasets].to_h do |k, v|
        [k, v.reject { |x| x.key?(:authorization) && !authorized_datasets.include?(x[:authorization][:id]) }]
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

        aggregation :conditions_total do
          filter exists: { field: :conditions }
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

        aggregation :frequency do
          nested do
            path :frequency
            aggregation :source do
              terms field: 'frequency.source',
                    size: cardinality[:frequency_sources],
                    include: Variation.frequency_datasets(user)
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
      end
    end

    module_function :total, :statistics
  end
end
