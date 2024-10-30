# frozen_string_literal: true

class VariationSearchService
  # @deprecated This class remains only for backwards compatibility
  class QueryParameters
    attr_reader :options
    attr_reader :debug
    attr_reader :error
    attr_reader :warning
    attr_reader :notice

    # @param [Hash] params The request parameters
    # @param [Hash] options
    # @option options [Boolean] :debug
    def initialize(params, **options)
      @params = params
      @options = options

      @debug = {}
      @error = []
      @warning = []
      @notice = []
    end

    # @return [Hash]
    def execute
      ResponseFormatter.new(param, search, @error, @warning, @notice, user: @options[:user]).to_hash
    end

    def query
      builder.build.tap { |q| debug[:query] = q if @options[:debug] }
    end

    def validate; end

    def results
      Variation.search(query).records.results
    end

    def filtered_count
      Variation.count(body: query.slice(:query))
    end

    private

    def stat_query
      builder.stat_query.tap { |q| debug[:stat_query] = q if @options[:debug] }
    end

    def param
      @param ||= Parameters.new(@params, user: @options[:user])
    end

    BINARY_FILTERS = %i[dataset type significance consequence sift polyphen alphamissense].freeze

    def builder
      @builder ||= begin
                     builder = Elasticsearch::QueryBuilder.new(user: @options[:user])

                     builder.term(param.term) if param.term.present?

                     builder.from = param.offset
                     builder.size = param.limit

                     if BINARY_FILTERS.map { |x| param.selected_none?(x) }.any?
                       builder.from = 0
                       builder.size = 0
                     else
                       builder.dataset(param.selected_items(:dataset), filter: param.quality == '1')

                       unless param.frequency == Parameters::Frequency.defaults
                         builder.frequency(param.selected_items(:dataset),
                                           param.frequency[:from],
                                           param.frequency[:to],
                                           param.frequency[:invert] == '1',
                                           param.frequency[:match] == 'all')
                       end

                       %i[type significance consequence sift polyphen alphamissense].each do |x|
                         unless param.selected_all?(x)
                           builder.send(x, *param.selected_items(x))
                         end
                       end
                     end

                     builder
                   end
    end

    def empty_result
      {
        total: Variation::QueryHelper.total(@options[:user]),
        filtered: 0,
        hits: [],
        aggs: {}
      }
    end

    def search
      return empty_result if BINARY_FILTERS.map { |x| param.selected_none?(x) }.any?

      param.term = hgvs_notation_to_location(param.term)
      res = Variation.search(query, request_cache: !param.term.present?)

      {
        total: Variation::QueryHelper.total(@options[:user]),
        filtered: filtered_count,
        results: res.records.results,
        aggs: param.stat? ? Variation.search(stat_query, request_cache: true).aggregations : {}
      }
    end

    def hgvs_notation_to_location(term)
      return if term.blank?
      return term unless HGVS.match?(term)

      HGVS.extract_location(term) do |t, e, w|
        @error << e if e.present?
        @warning << w if w.present?
        @notice << "Translate HGVS representation '#{term}' to '#{t}'" unless term == t
        term = t
      end

      term
    end

    class Parameters
      attr_writer :term
      attr_reader :dataset
      attr_reader :frequency
      attr_reader :quality
      attr_reader :type
      attr_reader :significance
      attr_reader :consequence
      attr_reader :sift
      attr_reader :polyphen
      attr_reader :alphamissense

      attr_reader :expand_dataset

      attr_reader :offset
      attr_reader :limit

      def initialize(params, **options)
        params = params.to_h.deep_symbolize_keys

        accessible = Variation.all_datasets(options[:user]).map(&:to_sym)

        @term = params.fetch(:term, '')
        @dataset = Dataset.defaults
                          .merge(params.fetch(:dataset, {}).slice(*accessible))
                          .merge(Dataset.defaults.keys.reject { |x| accessible.include?(x) }.to_h { |x| [x, '0'] })

        @frequency = Frequency.defaults.merge(params.fetch(:frequency, {}))
        @quality = params.fetch(:quality, '1')
        @type = Type.defaults.merge(params.fetch(:type, {}))
        @significance = ClinicalSignificance.defaults.merge(params.fetch(:significance, {}))
        @consequence = Consequence.defaults.merge(params.fetch(:consequence, {}))
        @sift = Sift.defaults.merge(params.fetch(:sift, {}))
        @polyphen = Polyphen.defaults.merge(params.fetch(:polyphen, {}))
        @alphamissense = AlphaMissense.defaults.merge(params.fetch(:alphamissense, {}))

        @expand_dataset = params.key?(:expand_dataset)

        @offset = params[:offset].is_a?(Array) ? params[:offset] : between(params.fetch(:offset, '0').to_i, 0, 10_000)
        @limit = between(params.fetch(:limit, '100').to_i, 0, 100)

        @stat = params.fetch(:stat, '1')
        @debug = params.key?(:debug)
        @options = options
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

      def term
        @term&.strip
      end

      def selected_items(attr_name)
        return nil unless %i[dataset type significance consequence sift polyphen alphamissense].include?(attr_name.to_sym)

        send(attr_name).select { |_, v| v == '1' }.keys
      end

      def selected_all?(attr_name)
        return nil unless %i[dataset type significance consequence sift polyphen alphamissense].include?(attr_name.to_sym)

        send(attr_name).all? { |_, v| v == '1' }
      end

      def selected_any?(attr_name)
        return nil unless %i[dataset type significance consequence sift polyphen alphamissense].include?(attr_name.to_sym)

        send(attr_name).any? { |_, v| v == '1' }
      end

      def selected_none?(attr_name)
        !selected_any?(attr_name)
      end

      def to_hash
        %i[term dataset frequency quality type significance consequence sift polyphen alphamissense expand_dataset].map do |name|
          [name, ((v = send(name)).respond_to?(:to_h) ? v.to_h : v)]
        end.to_h
      end

      private

      def between(v, min, max)
        [[v, min].max, max].min
      end

      def count_only?
        return true if @dataset.all? { |_, v| v.to_i.zero? }
        return true if @type.all? { |_, v| v.to_i.zero? }
        return true if @significance.all? { |_, v| v.to_i.zero? }
        return true if @consequence.all? { |_, v| v.to_i.zero? }

        false
      end

      class Parameter
        attr_accessor :key
        attr_accessor :label
        attr_accessor :param_name
        attr_accessor :default

        def initialize(key, label, param_name, default)
          @key = key
          @label = label
          @param_name = param_name
          @default = default
        end
      end

      module Base
        extend ActiveSupport::Concern

        module ClassMethods
          def defaults
            self::ALL.to_h { |x| [x.param_name.to_sym, x.default] }
          end

          def parameters
            self::ALL.map(&:param_name)
          end

          def find_by_param_name(name)
            self::ALL.find { |x| x.param_name == name.to_s }
          end
        end
      end

      class Dataset
        include Base

        ALL = Rails.application.config.application[:datasets].values.flat_map do |x|
          x.map { |y| Parameter.new(y[:id], y[:label], y[:id], y.key?(:authorization) ? '0' : '1') }
        end
      end

      class Frequency
        include Base

        ALL = Rails.application.config.application[:query_params][:frequency]
                   .map { |x| Parameter.new(x[:id], x[:label], x[:key], x[:default]) }
      end

      class Type
        include Base

        ALL = Rails.application.config.application.dig(:query_params, :type)
                   .map { |x| Parameter.new(x[:id], x[:label], x[:key], x[:default]) }
      end

      class ClinicalSignificance
        include Base

        ALL = Rails.application.config.application.dig(:query_params, :significance)
                   .map { |x| Parameter.new(x[:id], x[:label], x[:key], x[:default]) }
      end

      class Consequence
        include Base

        ALL = Rails.application.config.application.dig(:query_params, :consequence)
                   .map { |x| Parameter.new(x[:id], x[:label], x[:key], x[:default]) }
      end

      class Sift
        include Base

        ALL = Rails.application.config.application.dig(:query_params, :sift)
                   .map { |x| Parameter.new(x[:id], x[:label], x[:key], x[:default]) }
      end

      class Polyphen
        include Base

        ALL = Rails.application.config.application.dig(:query_params, :polyphen)
                   .map { |x| Parameter.new(x[:id], x[:label], x[:key], x[:default]) }
      end

      class AlphaMissense
        include Base

        ALL = Rails.application.config.application.dig(:query_params, :alphamissense)
                   .map { |x| Parameter.new(x[:id], x[:label], x[:key], x[:default]) }
      end
    end
  end
end
