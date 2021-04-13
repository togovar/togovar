# frozen_string_literal: true

module TogoVar
  module API
    module Models
      module Version1
        class Dataset < Base
          ACCEPTABLE_DATASET = %w[
            jga_ngs
            jga_snp
            hgvd
            tommo_4.7kjpn
            gem_j_wga
            exac
            gnomad
          ].freeze

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
