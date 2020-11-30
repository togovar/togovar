# frozen_string_literal: true

module TogoVar
  module API
    module Models
      module Version1
        # noinspection RubyClassModuleNamingConvention
        class Or < Bool
          def initialize(*args)
            super(*args, operator: 'or')
          end
        end
      end
    end
  end
end
