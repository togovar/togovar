# frozen_string_literal: true

begin
  Rails.application.configure do
    config.keycloak = {
      client_id: ENV.fetch('TOGOVAR_KEYCLOAK_CLIENT_ID'),
      client_secret: ENV.fetch('TOGOVAR_KEYCLOAK_CLIENT_SECRET'),
      client_options: {
        site: ENV.fetch('TOGOVAR_KEYCLOAK_URL'),
        realm: ENV.fetch('TOGOVAR_KEYCLOAK_REALM'),
        base_url: ENV.fetch('TOGOVAR_KEYCLOAK_BASE_URL')
      },
      authorize_params: {
        scope: ENV.fetch('TOGOVAR_KEYCLOAK_AUTHORIZE_SCOPE')
      }
    }
  end

  Rails.application.config.middleware.use OmniAuth::Builder do
    config = Rails.application.config.keycloak

    provider :keycloak_openid,
             config.dig(:client_id),
             config.dig(:client_secret),
             client_options: config.dig(:client_options),
             authorize_params: config.dig(:authorize_params),
             name: 'keycloak'
  end
rescue => e
  Rails.logger.warn('omniauth') { "#{e.message} at #{e.backtrace.first}" }
end
