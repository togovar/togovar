module ReportType
  class GeneController < ApplicationController
    def list
      respond_to do |format|
        format.html
        format.json do
          render json: Gene.new(params.permit(:type, :term, :start, :length))
        end
      end
    end
  end
end
