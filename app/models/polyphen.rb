# frozen_string_literal: true

class Polyphen
  Prediction = Struct.new(:id, :key, :label, :index, keyword_init: true)

  module Predictions
    PROBABLY_DAMAGING = Prediction.new(id: :probably_damaging, key: 'PROBD', label: 'Probably Damaging', index: 0)
    POSSIBLY_DAMAGING = Prediction.new(id: :possibly_damaging, key: 'POSSD', label: 'Possibly Damaging', index: 1)
    BENIGN = Prediction.new(id: :benign, key: 'B', label: 'Benign', index: 2)
    UNKNOWN = Prediction.new(id: :unknown, key: 'U', label: 'Unknown', index: 3)
  end

  class << self
    # @return [Array<Prediction>]
    def all
      @all ||= Predictions.constants.map { |x| Predictions.const_get(x) }.sort_by(&:index)
    end

    # @return [Prediction]
    def find_by_value(value)
      case
      when value > 0.908
        Predictions::PROBABLY_DAMAGING
      when value > 0.446
        Predictions::POSSIBLY_DAMAGING
      when value < 0.446
        Predictions::BENIGN
      else
        Predictions::UNKNOWN
      end
    end
  end
end
