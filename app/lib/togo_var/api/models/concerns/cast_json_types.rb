# frozen_string_literal: true

module TogoVar
  module API
    module Models
      module Concerns
        module CastJsonTypes
          INTEGER_REGEX = /\A[+-]?\d+\z/.freeze

          # @param [Object, nil] value
          # @return [Numeric, nil]
          # noinspection RubyYardReturnMatch
          def cast_numeric(value)
            if value.nil? || value.is_a?(Integer) || value.is_a?(Float)
              value
            elsif value.to_s.match?(INTEGER_REGEX)
              Integer(value)
            else
              Float(value)
            end
          rescue ArgumentError
            nil
          end

          # @param [Object, nil] value
          # @return [TrueClass, FalseClass, nil]
          # noinspection RubyYardReturnMatch
          def cast_boolean(value)
            if value.nil? || value.is_a?(TrueClass) || value.is_a?(FalseClass)
              value
            elsif ActiveModel::Type::Boolean::FALSE_VALUES.include?(value)
              false
            else
              true
            end
          rescue ArgumentError
            nil
          end
        end
      end
    end
  end
end
