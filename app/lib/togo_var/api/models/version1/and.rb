# frozen_string_literal: true

module TogoVar
  module API
    module Models
      module Version1
        class And < Bool
          def initialize(*args)
            super(*args, operator: 'and')
          end
        end
      end
    end
  end
end
