# frozen_string_literal: true

module TogoVar
  module API
    module Models
      module Version1
        class Polyphen < Base
          self.key_name = :polyphen

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

            @models = []
            if score.is_a?(Hash)
              @models.push({ polyphen: Range.new(score.merge(field: 'polyphen')) })
            else
              @models.push({ polyphen: NotExist.new(field: 'polyphen') }) if score.include?('unassigned')
              @models.push({ polyphen: Range.new(lt: 0, field: 'polyphen') }) if score.include?('unknown')
            end

            @models
          end

          def to_hash
            validate

            models = self.models

            Elasticsearch::DSL::Search.search do
              if models.size > 1
                query do
                  bool do
                    models.each do |m|
                      should m[:polyphen]
                    end
                  end
                end
              else
                query models.first[:polyphen]
              end
            end.to_hash[:query]
          end
        end
      end
    end
  end
end
