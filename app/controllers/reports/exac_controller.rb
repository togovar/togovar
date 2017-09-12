module Reports
  class ExacController < ApplicationController
    def show(id)
      @exac_id = id
      @gene_id = 'ENSG00000196616'
      @params  = { exac_id: @exac_id,
                   gene_id: @gene_id }
    end
  end
end
