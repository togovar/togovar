# frozen_string_literal: true

module API
  class InspectController < ApplicationController
    include Executable

    wrap_parameters name: :body, format: :json

    def disease
      params = disease_params.to_h

      respond_to do |format|
        format.html { render plain: 'Not implemented', content_type: 'text/plain', status: :not_implemented }
        format.json do
          renderer = params.key?(:pretty) ? :pretty_json : :json

          action = InspectDisease.run(params)
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

    private

    def disease_params
      params.permit(:pretty, :node, body: {})
    end
  end
end
