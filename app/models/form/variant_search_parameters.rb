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
      params = args.last.respond_to?(:to_hash) ? args.pop.to_hash : {}

      params.deep_symbolize_keys!

      @term = params.fetch(:term, '')
      @dataset = Form::Dataset.defaults.merge(params.fetch(:dataset, {}))
      @frequency = Form::Frequency.defaults.merge(params.fetch(:frequency, {}))
      @quality = params.fetch(:quality, '1')
      @type = Form::Type.defaults.merge(params.fetch(:type, {}))
      @significance = Form::ClinicalSignificance.defaults.merge(params.fetch(:significance, {}))
      @consequence = Form::Consequence.defaults.merge(params.fetch(:consequence, {}))
      @sift = Form::Sift.defaults.merge(params.fetch(:sift, {}))
      @polyphen = Form::Polyphen.defaults.merge(params.fetch(:polyphen, {}))

      @offset = params.fetch(:offset, '0').to_i.between(0, 10_000)
      @limit = params.fetch(:limit, '100').to_i.between(0, 100)

      @stat = params.fetch(:stat, '1')
      @debug = params.key?(:debug)
      @start_only = params.key?(:start_only)
    end

    def [](symbol_or_string)
      instance_variable_get("@#{symbol_or_string}")
    end

    def debug?
      @debug
    end

    def stat?
      @stat != '0'
    end

    def start_only?
      @start_only
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
  end
end

class Integer
  def between(min, max)
    [[self, min].max, max].min
  end
end
