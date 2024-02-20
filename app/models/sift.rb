# frozen_string_literal: true

class Sift
  Prediction = Struct.new(:id, :key, :label, :index, keyword_init: true)

  module Predictions
    WITHOUT_SCORE = Prediction.new(id: :without_score, key: 'N', label: 'Without score', index: 0)
    DELETERIOUS = Prediction.new(id: :deleterious, key: 'D', label: 'Deleterious', index: 1)
    TOLERATED = Prediction.new(id: :tolerated, key: 'T', label: 'Tolerated', index: 2)
  end

  class << self
    # @return [Array<Prediction>]
    def all
      @all ||= Predictions.constants.map { |x| Predictions.const_get(x) }.sort_by(&:index)
    end

    # @return [Prediction]
    def find_by_value(value)
      return Predictions::WITHOUT_SCORE if value.blank?

      if value < 0.05
        Predictions::DELETERIOUS
      elsif value >= 0.05
        Predictions::TOLERATED
      end
    end
  end
end
