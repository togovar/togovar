# frozen_string_literal: true

module TogoVar
  module API
    module Models
      module Version1
        class Range < Base
          attr_reader :field
          attr_reader :gte
          attr_reader :gt
          attr_reader :lte
          attr_reader :lt

          validates :field, presence: true
          validates :gte, :gt, :lte, :lt, numericality: true, allow_nil: true
          validate do
            errors.add(:base, "Use either of 'gte' or 'ge'") if gte.present? && gt.present?
            errors.add(:base, "Use either of 'lte' or 'lt'") if lte.present? && lt.present?
            errors.add(:base, "Use at least one of 'gte', 'ge', 'lte', or 'lt'") if [gte, gt, lte, lt].all?(&:nil?)
          end

          def initialize(*args)
            super

            arg = @args.first

            @field = arg[:field]
            @gte = arg[:gte]
            @gt = arg[:gt]
            @lte = arg[:lte]
            @lt = arg[:lt]
          end

          def to_hash
            validate

            field = @field
            gte = cast_numeric(@gte)
            gt = cast_numeric(@gt)
            lte = cast_numeric(@lte)
            lt = cast_numeric(@lt)

            Elasticsearch::DSL::Search.search do
              query do
                range field.to_sym do
                  gte gte if gte.present?
                  gt gt if gt.present?
                  lte lte if lte.present?
                  lt lt if lt.present?
                end
              end
            end.to_hash[:query]
          end
        end
      end
    end
  end
end
