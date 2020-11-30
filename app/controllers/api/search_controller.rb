# frozen_string_literal: true

module API
  class SearchController < ApplicationController
    include Executable

    wrap_parameters name: :body, format: :json

    def variation
      respond_to do |format|
        format.html { render plain: 'Not implemented', content_type: 'text/plain', status: :not_implemented }
        format.json do
          @result, status = search_variation

          renderer = variation_params.key?(:pretty) ? :pretty_json : :json
          render renderer => @result, status: status
        end
      end
    end

    private

    # @return [ActionController::Parameters]
    # noinspection RubyYardReturnMatch
    def variation_params
      @variation_params ||= params.permit(:debug, :pretty, body: {})
    end

    # @return [Array] [result, status]
    def search_variation
      params = variation_params

      service = VariationSearchService.new(params.to_h, headers: request_headers, debug: params.key?(:debug))

      execute(service).tap { |r, _| r.update(debug: service.debug) if params.key?(:debug) }
    end
  end
end
