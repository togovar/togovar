module Reports
  class GeneController < ApplicationController
    def show(id)
      @gene_id = id
      @gene = Gene.find(id)
    end
  end
end
