# frozen_string_literal: true

module TogoVar
  module API
    module Models
      module Concerns
        module NestedErrors
          extend ActiveSupport::Concern

          def full_messages
            build_messages(nested_messages)
          end

          def nested_messages
            ret = errors.messages

            return ret unless respond_to?(:models)

            models.each do |hash|
              hash.each do |k, v|
                next unless (errors = v.nested_messages).present?

                set_or_append(ret, k, errors)
              end
            end

            ret
          end

          private

          def set_or_append(ret, key, errors)
            if ret.key?(key)
              if (e = ret[key]).is_a?(Array)
                ret[key] << errors
              else
                ret[key] = [e] + [errors]
              end
            else
              ret[key] = errors
            end
          end

          def build_messages(hash, keys = [])
            full_messages = []

            hash.each do |k, v|
              if v.is_a?(Array)
                append_children(v, keys, k, full_messages)
              else
                full_messages.push(*build_messages(v, keys + [k]))
              end
            end

            full_messages
          end

          def append_children(children, parent_keys, own_key, full_messages)
            children.each do |obj|
              if obj.is_a?(String)
                full_messages << full_message(parent_keys, own_key, obj)
              else
                obj.each do |k2, v2|
                  full_messages.push(*build_messages(v2, parent_keys + [own_key, k2]))
                end
              end
            end
          end

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
