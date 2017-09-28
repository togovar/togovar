module Reports
  class ExacController < ApplicationController
    def show(id)
      @exac_id = id
      @gene_id = Exac.genes(id)
      @params  = { exac_id: @exac_id,
                   gene_id: @gene_id }
    end
  end
end
