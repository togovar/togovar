module Reports
  class ClinVarController < ApplicationController
    def show(id)
      @clin_var_id = id
    end
  end
end
