module ReportType
  class DiseaseController < ApplicationController
    def list
      respond_to do |format|
        format.html
        format.json do
          render json: Disease.new(params.permit(:type, :term, :start, :length))
        end
      end
    end
  end
end
