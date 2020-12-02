# frozen_string_literal: true

module TogoVar
  module API
    module Models
      module Version1
        class NonStrictTerms < Base
          ACCEPTABLE_RELATIONS = %w[eq ne].freeze

          attr_reader :relation
          attr_reader :terms

          validates :terms, :relation, presence: true
          validate do
            next if acceptable_relations.include? @relation

            list = acceptable_relations.to_sentence(CommonOptions::SENTENCE_OR_CONNECTORS)
            errors.add(:relation, "must be one of '#{list}'")
          end

          def initialize(*args)
            super

            arg = @args.first

            @relation = arg[:relation]
            @terms = Array(arg[:terms])
          end

          # All subclass must implement this method
          #
          # @return [Array]
          def to_hash
            raise NotImplementedError
          end

          protected

          def acceptable_relations
            ACCEPTABLE_RELATIONS
          end
        end
      end
    end
  end
end
