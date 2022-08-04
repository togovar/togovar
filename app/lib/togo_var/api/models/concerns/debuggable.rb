# frozen_string_literal: true

module TogoVar
  module API
    module Models
      module Concerns
        module Debuggable
          extend ActiveSupport::Concern

          class Debugger
            def initialize
              @debug = []
            end

            def all
              @debug.slice(0..)
            end

            # @param [#to_h, #to_s] obj
            def add(obj)
              @debug << (obj.respond_to?(:to_h) ? obj.to_h : obj.to_s)
            end

            def clear
              @debug.clear
            end
          end

          def debug
            @debug ||= Debugger.new
          end

          def nested_debugs
            ret = []

            ret.push(*debug.all)

            if respond_to?(:models)
              models.each do |model|
                (model.is_a?(Array) ? model : model.values).each do |m|
                  ret.push(*m.nested_debugs)
                end
              end
            end

            ret
          end
        end
      end
    end
  end
end
