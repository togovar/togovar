class SuggestController < ApplicationController
  def index
    action = SuggestTerms.run(term: suggest_params[:term])

    if action.valid?
      respond_to do |format|
        format.json { render json: action.result }
      end
    else
      render json: { errors: action.errors.full_messages }, status: :bad_request
    end
  end

  private

  def suggest_params
    params.permit(:term, :format)
  end
end
