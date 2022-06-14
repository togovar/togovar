# frozen_string_literal: true

module API
  class SearchController < ApplicationController
    include Executable

    module BackwardCompatibility
      FILTER_PARAMETERS = %w[term quality stat dataset frequency type significance consequence sift polyphen].freeze
      private_constant :FILTER_PARAMETERS

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

    def gene
      search_action gene_params.to_h, SearchGene
    end

    def disease
      search_action disease_params.to_h, SearchDisease
    end

    private

    def variant_params
      @variant_params ||= params.permit(:debug, :pretty, :version, :limit, :offset, query: {}, body: {})
    end

    def gene_params
      params.permit(:pretty, :term, body: {})
    end

    def disease_params
      params.permit(:pretty, :term, body: {})
    end

    # @return [Array] [result, status]
    def search_variant
      params = variant_params

      service = VariationSearchService.new(params.to_h, headers: request_headers, debug: params.key?(:debug))

      execute(service).tap { |r, _| r.update(debug: service.debug) if params.key?(:debug) }
    end

    def search_action(params, action)
      respond_to do |format|
        format.html { render plain: 'Not implemented', content_type: 'text/plain', status: :not_implemented }
        format.json do
          renderer = params.key?(:pretty) ? :pretty_json : :json

          action = action.run(params)
          if action.valid?
            render renderer => action.result
          else
            render renderer => { errors: action.errors.full_messages }, status: :bad_request
          end
        end
      end
    rescue StandardError => e
      Rails.logger.error(self.class) { e }
      render json: { errors: ['Internal server error'] }, status: :internal_server_error
    end
  end
end
