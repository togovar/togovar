module Reports
  class GeneController < ApplicationController
    def show(id)
      @tax_id, @gene_id = id.split(':')
      @gene = Gene.find(id)
    end
  end
end
