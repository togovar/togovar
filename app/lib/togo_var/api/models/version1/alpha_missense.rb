# frozen_string_literal: true

module TogoVar
  module API
    module Models
      module Version1
        class AlphaMissense < Base
          self.key_name = :alphamissense

          attr_reader :score

          validates :score, presence: true

          def initialize(*args)
            super

            arg = @args.first

            @score = arg[:score]
          end

          # @return [Array]
          def models
            return @models if @models

            model = {}
            if score.is_a?(Hash)
              model.update(alphamissense: Range.new(score.merge(field: 'alphamissense')))
            else
              model.update(alphamissense: NotExist.new(field: 'alphamissense')) if score.include?('unassigned')
            end

            @models = [model]
          end

          def to_hash
            validate

            models = self.models.first

            Elasticsearch::DSL::Search.search do
              query models[:alphamissense]
            end.to_hash[:query]
          end
        end
      end
    end
  end
end
