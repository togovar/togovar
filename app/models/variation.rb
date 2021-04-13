class Variation
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

        aggregation :interpretations do
          terms field: 'clinvar.interpretation',
                size: cardinality[:clinvar_interpretations]
        end

        aggregation :frequency do
          nested do
            path :frequency
            aggregation :sources do
              terms field: 'frequency.source',
                    size: cardinality[:frequency_sources]
            end
          end
        end
      end
    end
    module_function :statistics
  end
end
