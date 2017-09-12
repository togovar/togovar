module Reports
  class ClinVarController < ApplicationController
    def show(id)
      @clinvar_id = id
    end
  end
end
