# frozen_string_literal: true

module API
  class SearchController < ApplicationController
    include Executable

    module BackwardCompatibility
      FILTER_PARAMETERS = %w[term quality stat dataset frequency type significance consequence sift polyphen].freeze
      private_constant :FILTER_PARAMETERS

      # @return [ActionController::Parameters]
      def variant_params
        return super unless include_filters?

        @variant_params ||= params.permit :term, :quality, :limit, :offset, :stat, :debug,
                                          dataset: {}, frequency: {}, type: {}, significance: {}, consequence: {},
                                          sift: {}, polyphen: {}
      end

      # @return [Array] [result, status]
      def search_variant
        return super unless include_filters?

        params = variant_params

        service = VariationSearchService::WithQueryParameters.new(params.to_h, debug: params.key?(:debug))

        execute(service).tap { |r, _| r.update(debug: service.debug) if params.key?(:debug) }
      end

      private

      def include_filters?
        (params.each_key.to_a & FILTER_PARAMETERS).present?
      end
    end
    prepend BackwardCompatibility

    wrap_parameters name: :body, format: :json

    def variant
      respond_to do |format|
        format.html { render plain: 'Not implemented', content_type: 'text/plain', status: :not_implemented }
        format.json do
          @result, status = search_variant

          renderer = variant_params.key?(:pretty) ? :pretty_json : :json
          render renderer => @result, status: status
        end
      end
    end

    private

    # @return [ActionController::Parameters]
    def variant_params
      @variant_params ||= params.permit(:debug, :pretty, :version, :limit, :offset, query: {}, body: {})
    end

    # @return [Array] [result, status]
    def search_variant
      params = variant_params

      service = VariationSearchService.new(params.to_h, headers: request_headers, debug: params.key?(:debug))

      execute(service).tap { |r, _| r.update(debug: service.debug) if params.key?(:debug) }
    end
  end
end
