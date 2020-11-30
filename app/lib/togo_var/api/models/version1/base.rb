# frozen_string_literal: true

require 'active_model/type'
require 'active_model/validations'

module TogoVar
  module API
    module Models
      module Version1
        class Base
          include ActiveModel::Validations
          include Models::Concerns::NestedErrors
          include Models::Concerns::CastJsonTypes
          include Models::Concerns::ElasticsearchQueryHelper

          class << self
            module ValidateWithDebug
              include Models::Concerns::Debuggable

              def validate(context = nil)
                result = valid?(context)
                result &&= validate_children.all? { |x| x == true } if respond_to?(:models)

                result.tap { |r| add_debug(r, context) }
              end

              def validate_children(context = nil)
                models.map do |model|
                  (model.is_a?(Array) ? model : model.values).map { |x| x.validate(context) }.all? { |x| x == true }
                end
              end

              def add_debug(result, context = nil)
                debug.add class: self.class.name,
                          action: :validate,
                          context: context,
                          valid: result,
                          errors: (respond_to?(:errors) ? errors.presence : nil)
              end
            end

            def inherited(subclass)
              super

              subclass.prepend ValidateWithDebug

              class << subclass
                attr_accessor :key_name
              end

              subclass.key_name = subclass.to_s.demodulize.underscore.to_sym
            end
          end

          attr_reader :args

          def initialize(*args)
            @args = args.map { |arg| arg.is_a?(Hash) ? arg.symbolize_keys : arg }

            debug.add class: self.class.name,
                      action: :initialize,
                      args: args
          end

          # All subclass must implement this method
          #
          # @return [Hash]
          def to_hash
            raise NotImplementedError
          end
        end
      end
    end
  end
end
