# frozen_string_literal: true

# Be sure to restart your server when you modify this file.

# Avoid CORS issues when API is called from the frontend app.
# Handle Cross-Origin Resource Sharing (CORS) in order to accept cross-origin AJAX requests.

# Read more: https://github.com/cyu/rack-cors

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins '*'

    resource '/search',
             headers: %w[Origin Authorization Accept Content-Type],
             methods: %i[get post head]

    resource '/api/*',
             headers: %w[Origin Authorization Accept Content-Type],
             methods: %i[get post head]
  end
end
