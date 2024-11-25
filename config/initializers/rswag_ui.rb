# frozen_string_literal: true

Rswag::Ui.configure do |c|
  c.openapi_endpoint '/api/v1.yml', 'TogoVar API v1'
  c.config_object["validatorUrl"] = 'none'
end
