require_relative 'parameter_base'

require_relative 'clinical_significance'
require_relative 'consequence'
require_relative 'dataset'
require_relative 'frequency'
require_relative 'polyphen'
require_relative 'sift'
require_relative 'type'

module Form
  # see doc/spec_for_search_query.md
  class VariantSearchParameters
    class << self
      def permit(params)
        params.permit(:term,
                      :quality,
                      :offset,
                      :limit,
                      :debug,
                      dataset: Form::Dataset.parameters,
                      frequency: Form::Frequency.parameters,
                      type: Form::Type.parameters,
                      significance: Form::ClinicalSignificance.parameters,
                      consequence: Form::Consequence.parameters,
                      sift: Form::Sift.parameters,
                      polyphen: Form::Polyphen.parameters)
      end
    end

    DEFAULT_DATASET = Form::Dataset.defaults.freeze
    DEFAULT_FREQUENCY = Form::Frequency.defaults.freeze
    DEFAULT_TYPE = Form::Type.defaults.freeze
    DEFAULT_SIGNIFICANCE = Form::ClinicalSignificance.defaults.freeze
    DEFAULT_CONSEQUENCE = Form::Consequence.defaults.freeze
    DEFAULT_SIFT = Form::Sift.defaults.freeze
    DEFAULT_POLYPHEN = Form::Polyphen.defaults.freeze

    attr_reader :dataset
    attr_reader :frequency
    attr_reader :quality
    attr_reader :type
    attr_reader :significance
    attr_reader :consequence
    attr_reader :sift
    attr_reader :polyphen

    attr_reader :offset
    attr_reader :limit

    def initialize(*args)
      options = args.last.respond_to?(:to_hash) ? args.pop.to_hash : {}

      options.deep_symbolize_keys!

      @term = args.shift || options.fetch(:term, '')
      @dataset = (args.shift || DEFAULT_DATASET.merge(options.fetch(:dataset, {})))
      @frequency = (args.shift || DEFAULT_FREQUENCY.merge(options.fetch(:frequency, {})))
      @quality = args.shift || options.delete(:quality) || 1
      @type = (args.shift || DEFAULT_TYPE.merge(options.fetch(:type, {})))
      @significance = (args.shift || DEFAULT_SIGNIFICANCE.merge(options.fetch(:significance, {})))
      @consequence = (args.shift || DEFAULT_CONSEQUENCE.merge(options.fetch(:consequence, {})))
      @sift = (args.shift || DEFAULT_SIFT.merge(options.fetch(:sift, {})))
      @polyphen = (args.shift || DEFAULT_POLYPHEN.merge(options.fetch(:polyphen, {})))

      @offset = args.shift || options.fetch(:offset, 0).to_i.between(0, 10_000)
      @limit = args.shift || options.fetch(:limit, 100).to_i.between(0, 100)

      @debug = options.fetch(:debug, false)
    end

    def debug?
      !!@debug
    end

    def term
      @term&.strip
    end

    def selected_items(attr_name)
      return nil unless %i[dataset type significance consequence sift polyphen].include?(attr_name.to_sym)

      send(attr_name).select { |_, v| v == '1' }.keys
    end

    def selected_all?(attr_name)
      return nil unless %i[dataset type significance consequence sift polyphen].include?(attr_name.to_sym)

      send(attr_name).all? { |_, v| v == '1' }
    end

    def selected_any?(attr_name)
      return nil unless %i[dataset type significance consequence sift polyphen].include?(attr_name.to_sym)

      send(attr_name).any? { |_, v| v == '1' }
    end

    def selected_none?(attr_name)
      !selected_any?(attr_name)
    end

    def to_hash
      %i[term dataset frequency quality type significance consequence sift polyphen].map do |name|
        [name, ((v = send(name)).respond_to?(:to_h) ? v.to_h : v)]
      end.to_h
    end

    private

    def count_only?
      return true if @dataset.all? { |_, v| v.to_i.zero? }
      return true if @type.all? { |_, v| v.to_i.zero? }
      return true if @significance.all? { |_, v| v.to_i.zero? }
      return true if @consequence.all? { |_, v| v.to_i.zero? }

      false
    end

    def dataset_given?
      @dataset_given ||= params.dataset.any? { |_, v| v == '1' }
    end

    def frequency_given?
      @frequency_given ||= begin
        (params.frequency[:from].to_f == 0) &&
          (params.frequency[:to].to_f == 1) &&
          (params.frequency[:invert] == '0') &&
          (params.frequency[:match] == 'any')
      end
    end

    def quality_given?
      @quality_given ||= (params.quality == '1')
    end

    def type_given?
      @type_given ||= params.type.any? { |_, v| v == '1' }
    end

    def significance_given?
      @significance_given ||= params.significance.any? { |_, v| v == '1' }
    end

    def consequence_given?
      @consequence_given ||= params.consequence.any? { |_, v| v == '1' }
    end

    def sift_given?
      @sift_given ||= params.sift.any? { |_, v| v == '1' }
    end

    def polyphen_given?
      @polyphen_given ||= params.polyphen.any? { |_, v| v == '1' }
    end
  end
end

class Integer
  def between(min, max)
    [[self, min].max, max].min
  end
end
