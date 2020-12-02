# frozen_string_literal: true

module TogoVar
  module API
    module Models
      module Version1
        class Bool < Base
          OPERATORS = {
            and: :must,
            or: :should
          }.freeze

          attr_reader :operator

          validates :operator, presence: true
          validate { errors.add(:args, 'must have at least 1 component') unless args.present? }
          validate { errors.add(:args, 'contains objects other than Hash') unless args.all? { |x| x.is_a?(Hash) } }
          validate do
            @args.select { |x| x.is_a?(Hash) }.flat_map(&:keys).each do |key|
              next if acceptable_components.key?(key.to_sym)

              list = acceptable_components.keys.to_sentence(CommonOptions::SENTENCE_OR_CONNECTORS)
              errors.add(:args, "must consist of '#{list}'")
              break
            end
          end

          def initialize(*args)
            super

            options = @args.last.is_a?(Hash) ? @args.pop : {}
            @operator = options[:operator]
          end

          # @return [Array]
          def models
            @models ||= args.map do |hash|
              k, v = hash.first
              array = v.is_a?(Array) ? v : []
              hash = v.is_a?(Hash) ? v : {}

              klass = acceptable_components.fetch(k.to_sym)

              { klass.key_name => klass.send(:new, *array, **hash) }
            end
          end

          def to_hash
            validate

            models = self.models
            method = OPERATORS.fetch(@operator&.to_sym)

            Elasticsearch::DSL::Search.search do
              query do
                bool do
                  models.each do |hash|
                    send(method, hash.values.first)
                  end
                end
              end
            end.to_hash[:query]
          end

          protected

          def acceptable_components
            VariationSearch::ACCEPTABLE_COMPONENTS
          end
        end
      end
    end
  end
end
