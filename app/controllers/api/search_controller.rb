# frozen_string_literal: true

module API
  class SearchController < ApplicationController
    include Executable
    include AuthHelper

    before_action :authenticate_user, only: %i[variant search_variant]

    wrap_parameters name: :body, format: :json

    def variant
      respond_to do |format|
        format.html { render plain: 'Not implemented', content_type: 'text/plain', status: :not_implemented }
        format.json do
          @result, status = search_variant

          if status == :ok && current_user.present? && !authorized?
            status = :forbidden
          end

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

    module BackwardCompatibility
      def variant_params
        return super unless request.get?

        @variant_params ||= params.permit :term, :quality, :limit, :offset, :stat, :data, :debug, :expand_dataset,
                                          dataset: {}, frequency: {}, type: {}, significance: {}, consequence: {},
                                          sift: {}, polyphen: {}, alphamissense: {}
      end

      # @return [Array] [result, status]
      def search_variant
        return super unless request.get?

        params = variant_params

        service = VariationSearchService::QueryParameters.new(params.to_h, debug: params.key?(:debug), user: current_user)

        execute(service).tap { |r, _| r.update(debug: service.debug) if params.key?(:debug) }
      end
    end
    prepend BackwardCompatibility

    DISABLE_VALUES = %w[0 f false]

    def variant_params
      return @variant_params if @variant_params

      hash = params.permit(:data, :debug, :formatter, :limit, :offset, :pretty, :stat, :version, body: {}, query: {})
      if (offset = params.permit(offset: [])[:offset]).present?
        hash.merge!(offset: offset)
      end

      hash[:data] = !DISABLE_VALUES.include?(hash[:data].to_s)
      hash[:stat] = !DISABLE_VALUES.include?(hash[:stat].to_s)

      p hash

      hash
    end

    # @return [Array] [result, status]
    def search_variant
      params = variant_params

      service = VariationSearchService.new(params.to_h, headers: request_headers, debug: params.key?(:debug), user: current_user)

      execute(service).tap { |r, _| r.update(debug: service.debug) if params.key?(:debug) }
    end

    def gene_params
      params.permit(:pretty, :term, body: {})
    end

    def disease_params
      params.permit(:pretty, :term, body: {})
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
