module Reports
  class VariationController < ApplicationController
    def show
      @allele_id    = params.permit(:allele_id)[:allele_id]
      @variation_id = Reports::Variation.variation_id_for_allele(@allele_id)
    end
  end
end
