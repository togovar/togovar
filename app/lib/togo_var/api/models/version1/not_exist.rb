# frozen_string_literal: true

module TogoVar
  module API
    module Models
      module Version1
        class NotExist < Base
          attr_reader :field

          validates :field, presence: true

          def initialize(*args)
            super

            arg = @args.first

            @field = arg[:field]
          end

          def to_hash
            validate

            field = @field

            Elasticsearch::DSL::Search.search do
              query do
                bool do
                  must_not do
                    exists do
                      field field
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
