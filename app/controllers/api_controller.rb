# frozen_string_literal: true

class ApiController < ActionController::Base
  def v1
    doc = Rails.cache.fetch('doc_api_v1.yml') do
      ERB.new(File.read(Rails.root.join('doc', 'api', 'v1.yml.erb'))).result
    end

    render plain: doc
  end
end

APIController = ApiController
