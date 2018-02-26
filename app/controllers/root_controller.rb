class RootController < ApplicationController
  def suggest
    respond_to do |format|
      format.html
      format.json do
        render json: Suggest.suggest(params.permit(:term)[:term])
      end
    end
  end

  def list
    respond_to do |format|
      format.html
      format.json do
        render json: Lookup.list(params.permit(:term, :start, :length))
      end
    end
  end
end
