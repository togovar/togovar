module AuthHelper
  def authenticate_user
    unless (token = access_token)
      session.delete(:user)
      return
    end

    if token.expired?
      new_token = token.refresh!

      session[:user][:credentials] = {
        token: new_token.token,
        refresh_token: new_token.refresh_token,
        expires_at: new_token.expires_at
      }

      session[:user][:info] = JSON::JWT.decode(new_token.token, JSON::JWK::Set.new(certs)).to_hash.deep_symbolize_keys
      session[:user][:id_token] = new_token['id_token']
    end
  rescue OAuth2::Error => e
    Rails.logger.error('authenticate_user') { e }

    session.delete(:user)
  end

  def authorized?
    valid_dataset.present?
  end

  def current_user
    @current_user ||= begin
                        return unless (info = session.dig(:user, :info)).present?

                        user = info.slice(*USER_INFO_KEYS)

                        status = {
                          granted: authorized?,
                          expires_at: (valid_dataset[:expires_at] if valid_dataset.present?)
                        }

                        user[:datasets] = {}
                        user[:datasets][DATASET_NAME.to_sym] = status if DATASET_NAME.present?

                        user
                      rescue => e
                        Rails.logger.error('authenticate_user') { e }
                        nil
                      end
  end

  private

  USER_INFO_KEYS = %i[preferred_username name given_name family_name email]

  DATASET_NAME = ENV.fetch('TOGOVAR_KEYCLOAK_AUTH_ATTRIBUTE_NAME', nil)
  ID_REGEX = if (v = ENV.fetch('TOGOVAR_KEYCLOAK_AUTH_ATTRIBUTE_REGEX', nil)).present?
               Regexp.compile(v)
             end

  def valid_dataset
    return unless (datasets = session.dig(:user, :info, DATASET_NAME.to_sym)).present?

    datasets.filter { |x| ID_REGEX.match?(x[:id]) }
            .filter { |x| DateTime.now < DateTime.parse(x[:expires_at]) }
            .sort_by { |x| DateTime.parse(x[:expires_at]) }
            .last
  rescue => e
    Rails.logger.error('valid_dataset') { e }
    nil
  end

  def access_token
    return unless (credentials = session.dig(:user, :credentials)).present?

    OAuth2::AccessToken.new(
      client,
      credentials[:token],
      refresh_token: credentials[:refresh_token],
      expires_at: credentials[:expires_at]
    )
  end

  def client
    OAuth2::Client.new(
      keycloak_config[:client_id],
      keycloak_config[:client_secret],
      **keycloak_config[:client_options].merge(authorize_url: openid_config[:authorization_endpoint],
                                               token_url: openid_config[:token_endpoint])
    )
  end

  def keycloak_config
    @keycloak_config ||= begin
                           Rails.application.config.keycloak
                         rescue
                           {}
                         end
  end

  def certs
    return unless (response = Faraday.get(certs_endpoint)).status == 200

    JSON.parse(response.body)["keys"]
  end

  def certs_endpoint
    openid_config[:jwks_uri]
  end

  def openid_config
    Rails.cache.fetch('openid_configuration') do
      site = keycloak_config.dig(:client_options, :site)
      base_url = keycloak_config.dig(:client_options, :base_url)
      realm = keycloak_config.dig(:client_options, :realm)

      config_url = URI.join(site, "#{base_url}/realms/#{realm}/.well-known/openid-configuration")

      return unless (response = Faraday.get(config_url)).status == 200

      JSON.parse(response.body).deep_symbolize_keys
    end
  end
end
