class RootController < ApplicationController
  protect_from_forgery except: %i[suggest list]

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
        parameters = [:term,
                      :start,
                      :length,
                      source:        [],
                      variant_type:  [],
                      freq_source:   [],
                      freq_relation: [],
                      freq_value:    [],
                      significance:  []]
        render json: Lookup.list(params.permit(*parameters))
      end
    end
  end
end
