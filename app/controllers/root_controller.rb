class RootController < ApplicationController
  def suggest
    term = suggest_params[:term]

    respond_to do |format|
      format.json do
        @response = if term && term.length >= 3
                      {
                        gene: Gene.suggest(term),
                        disease: Disease.suggest(term)
                      }
                    else
                      Hash.new { [] }
                    end

        render 'suggest', formats: :json, handlers: 'jbuilder'
      end
    end
  end

  def suggest_params
    params.permit(:term, :format)
  end
end
