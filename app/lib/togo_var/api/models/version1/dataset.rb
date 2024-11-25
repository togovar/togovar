# frozen_string_literal: true

module TogoVar
  module API
    module Models
      module Version1
        class Dataset < Base
          DATASETS = Rails.application.config.application.dig(:datasets, :frequency)
          ACCEPTABLE_DATASET = DATASETS.flat_map { |dataset| [dataset[:id]].concat(Array(dataset[:groups]).map { |x| x.is_a?(Hash) ? x[:id] : x }) }.compact

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
            # TODO: remove if dataset renamed
            name = 'jga_ngs' if name == 'jga_wes'
            name = "#{name}.all" if name.match?(/^bbj_riken.mpheno\d+$/)

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
