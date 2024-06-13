# frozen_string_literal: true

module TogoVar
  module API
    module Models
      module Concerns
        module NestedErrors
          extend ActiveSupport::Concern

          def nested_errors
            ret = ActiveModel::Errors.new(self)

            child_errors(ret)
          end

          def child_errors(errors, keys = [])
            return errors unless respond_to?(:models)

            models.each do |hash|
              hash.each do |key, model|
                model.child_errors(errors, (keys + [key]))

                next if model.errors.messages.blank?

                model.errors.each do |e|
                  errors.import(e, attribute: (keys + [key]).join('.').to_sym)
                end
              end
            end

            errors
          end

          private

          def full_message(parent_keys, key, message)
            if parent_keys.empty?
              %(#{key} #{message})
            elsif key == :base
              %(#{parent_keys.join('/')}: #{message})
            else
              %(#{parent_keys.join('/')}/#{key} #{message})
            end
          end
        end
      end
    end
  end
end
