# frozen_string_literal: true

module TogoVar
  module API
    module Models
      module Version1
        class Dataset < Base
          DATASETS = Rails.application.config.application.dig(:datasets, :frequency)
          ACCEPTABLE_DATASET = (DATASETS.map { |x| x[:id] } + DATASETS.filter_map { |x| x[:groups] if x[:groups] }.flatten).sort

          attr_reader :name

          validates :name, presence: true
          validate do
            next if acceptable_dataset.include?(name)

            list = acceptable_dataset.to_sentence(CommonOptions::SENTENCE_OR_CONNECTORS)
            errors.add(:name, "must be one of '#{list}'")
          end

          def initialize(*args)
            super

            arg = @args.first

            @name = arg[:name]
          end

          def to_hash
            validate

            name = @name

            Elasticsearch::DSL::Search.search do
              query do
                match 'frequency.source': name
              end
            end.to_hash[:query]
          end

          protected

          def acceptable_dataset
            ACCEPTABLE_DATASET
          end
        end
      end
    end
  end
end
