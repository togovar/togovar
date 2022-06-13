# frozen_string_literal: true

module TogoVar
  module API
    module Models
      module Version1
        class Chromosome < Base
          ACCEPTABLE_VALUE = (('1'..'22').to_a + %w[X Y MT]).freeze

          attr_reader :name

          validates :name, presence: true
          validate do
            next if acceptable_value.include?(name)

            list = acceptable_value.to_sentence(CommonOptions::SENTENCE_OR_CONNECTORS)
            errors.add(:name, "must be one of '#{list}'")
          end

          def initialize(*args)
            super

            arg = @args.first

            @name = arg
          end

          def to_hash
            validate

            name = @name

            Elasticsearch::DSL::Search.search do
              query do
                match 'chromosome.label': name
              end
            end.to_hash[:query]
          end

          protected

          def acceptable_value
            ACCEPTABLE_VALUE
          end
        end
      end
    end
  end
end
