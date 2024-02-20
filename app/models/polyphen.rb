# frozen_string_literal: true

class Polyphen
  Prediction = Struct.new(:id, :key, :label, :index, keyword_init: true)

  module Predictions
    WITHOUT_SCORE = Prediction.new(id: :without_score, key: 'N', label: 'Without score', index: 0)
    PROBABLY_DAMAGING = Prediction.new(id: :probably_damaging, key: 'PROBD', label: 'Probably Damaging', index: 1)
    POSSIBLY_DAMAGING = Prediction.new(id: :possibly_damaging, key: 'POSSD', label: 'Possibly Damaging', index: 2)
    BENIGN = Prediction.new(id: :benign, key: 'B', label: 'Benign', index: 3)
    UNKNOWN = Prediction.new(id: :unknown, key: 'U', label: 'Unknown', index: 4)
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
      when value > 0.908
        Predictions::PROBABLY_DAMAGING
      when value > 0.446
        Predictions::POSSIBLY_DAMAGING
      when value >= 0
        Predictions::BENIGN
      else
        Predictions::UNKNOWN
      end
    end
  end
end
