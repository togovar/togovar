# frozen_string_literal: true

module TogoVar
  module API
    module Models
      module Version1
        class VariationFrequency < Base
          self.key_name = :frequency

          attr_reader :dataset
          attr_reader :frequency
          attr_reader :count
          attr_reader :filtered

          validate { errors.add(:base, "Use either of 'count' or 'frequency'") unless count.nil? ^ frequency.nil? }

          def initialize(*args)
            super

            arg = @args.first.dup

            @dataset = arg[:dataset]
            @frequency = arg[:frequency]
            @count = arg[:count]
            @filtered = arg[:filtered]
          end

          # @return [Array]
          def models
            return @models if @models

            model = {}
            model.update(dataset: Dataset.new(@dataset)) if @dataset
            model.update(frequency: Range.new(@frequency.merge(field: 'frequency.allele.frequency'))) if @frequency
            model.update(count: Range.new(@count.merge(field: 'frequency.allele.count'))) if @count

            @models = [model]
          end

          def to_hash
            validate

            models = self.models.first
            filtered = cast_boolean(@filtered)

            Elasticsearch::DSL::Search.search do
              query do
                nested do
                  path :frequency
                  query do
                    bool do
                      must models[:dataset] if models[:dataset]
                      must models[:frequency] if models[:frequency]
                      must models[:count] if models[:count]
                      must { match 'frequency.filter': 'PASS' } if filtered.present?
                    end
                  end
                end
              end
            end.to_hash[:query]
          end
        end
      end
    end
  end
end
