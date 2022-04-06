# frozen_string_literal: true

class VariationSearchService
  # @deprecated This class remains only for backwards compatibility
  class WithQueryParameters
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
      clear_all

      ResponseFormatter.new(param, search, @error, @warning, @notice).format
    end

    private

    def clear_all
      %i[debug error warning notice].each { |x| send(x).clear }
    end

    def stat_query
      builder.stat_query.tap { |q| debug[:stat] = q if @options[:debug] }
    end

    def query
      builder.build.tap { |q| debug[:query] = q if @options[:debug] }
    end

    def param
      @param ||= Form::VariantSearchParameters.new(@params)
    end

    BINARY_FILTERS = %i[dataset type significance consequence sift polyphen].freeze

    def builder
      @builder ||= begin
                     builder = Elasticsearch::QueryBuilder.new

                     builder.start_only = param.start_only?

                     builder.term(param.term) if param.term.present?

                     builder.from = param.offset
                     builder.size = param.limit

                     if BINARY_FILTERS.map { |x| param.selected_none?(x) }.any?
                       builder.from = 0
                       builder.size = 0
                     else
                       builder.dataset(param.selected_items(:dataset)) unless param.selected_all?(:dataset)

                       unless param.frequency == Form::Frequency.defaults
                         builder.frequency(param.selected_items(:dataset),
                                           param.frequency[:from],
                                           param.frequency[:to],
                                           param.frequency[:invert] == '1',
                                           param.frequency[:match] == 'all')
                       end

                       builder.quality(param.selected_items(:dataset)) if param.quality == '1'

                       %i[type significance consequence sift polyphen].each do |x|
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
        filtered_total: 0,
        hits: [],
        aggs: {}
      }
    end

    def search
      return empty_result if BINARY_FILTERS.map { |x| param.selected_none?(x) }.any?

      term = hgvs_notation_to_location(param.term)
      res = Variation.search((q = query), request_cache: !term.present?)

      {
        filtered_total: Variation.count(body: q.slice(:query)),
        results: res.records.results,
        aggs: param.stat? ? Variation.search(stat_query).aggregations : {}
      }
    end

    def hgvs_notation_to_location(term)
      return term unless HGVS.match?(term)

      HGVS.extract_location(term) do |t, e, w|
        @error << e
        @warning << w
        @notice << "Translate HGVS representation '#{term}' to '#{t}'" unless term == t
        term = t
      end

      term
    end
  end
end
