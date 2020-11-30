# frozen_string_literal: true

class VariationSearchService
  # @deprecated This class remains only for backwards compatibility
  class WithQueryParameters
    attr_reader :options
    attr_reader :debug

    # @param [Hash] params The request parameters
    # @param [Hash] options
    # @option options [Boolean] :debug
    def initialize(params, **options)
      @params = params
      @options = options

      @debug = {}
      @errors = {}
    end

    # @return [Hash]
    def execute
      debug.clear

      # TODO: return search result
      query

      {}
    end
  end
end
