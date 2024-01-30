# frozen_string_literal: true

class AlphaMissense
  Prediction = Struct.new(:id, :key, :label, :index, keyword_init: true)

  module Predictions
    WITHOUT_SCORE = Prediction.new(id: :without_score, key: 'N', label: 'Without score', index: 0)
    LIKELY_BENIGN = Prediction.new(id: :likely_benign, key: 'LB', label: 'Likely benign', index: 1)
    LIKELY_PATHOGENIC = Prediction.new(id: :likely_pathogenic, key: 'LP', label: 'Likely pathogenic', index: 2)
    AMBIGUOUS = Prediction.new(id: :ambiguous, key: 'A', label: 'Ambiguous', index: 3)
  end

  class << self
    # @return [Array<Prediction>]
    def all
      @all ||= Predictions.constants.map { |x| Predictions.const_get(x) }.sort_by(&:index)
    end

    # @return [Prediction]
    def find_by_value(value)
      return Predictions::WITHOUT_SCORE if value.blank?

      case
      when value < 0.34
        Predictions::LIKELY_BENIGN
      when value > 0.564
        Predictions::LIKELY_PATHOGENIC
      else
        Predictions::AMBIGUOUS
      end
    end
  end
end
