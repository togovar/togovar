class RootController < ApplicationController

  def suggest
    case params[:type]
    when 'disease'
      render json: Disease.auto_complete(params[:term])
    else
      raise("Unknown search type: #{params[:type]}")
    end
  end

end
