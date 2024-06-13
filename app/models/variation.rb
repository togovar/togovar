class Variation
  module Datasets
    DATASETS = Rails.application.config.application[:datasets]
    private_constant :DATASETS

    FREQUENCY_WITH_FILTER = Array(DATASETS[:frequency].filter_map { |x| x[:id] if x[:filter] }).map(&:to_sym)
    FREQUENCY = Array(DATASETS[:frequency].map { |x| x[:id] }).map(&:to_sym)
    ALL = FREQUENCY + Array(DATASETS[:annotation].filter_map { |x| x[:id] }).map(&:to_sym)
  end

  include Variation::Searchable

  module QueryHelper
    def statistics
      cardinality = Variation.cardinality

      Elasticsearch::DSL::Search.search do
        aggregation :types do
          terms field: :type,
                size: cardinality[:types]
        end

        aggregation :vep do
          nested do
            path :vep
            aggregation :consequences do
              terms field: 'vep.consequence',
                    size: cardinality[:vep_consequences]
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
                    size: cardinality[:clinvar_interpretations]
            end
          end
        end

        aggregation :frequency do
          nested do
            path :frequency
            aggregation :sources do
              terms field: 'frequency.source',
                    size: cardinality[:frequency_sources],
                    include: Variation::Datasets::FREQUENCY.map(&:to_s)
            end
          end
        end
      end
    end
    module_function :statistics
  end
end
