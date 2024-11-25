class AuthController < ActionController::Base
  include AuthHelper

  protect_from_forgery with: :exception

  before_action :authenticate_user, only: %i[status]

  def auth_login
    if request.referer.present?
      session[:redirect_url] = (url = URI(request.referer)).query.blank? ? url.path : "#{url.path}?#{url.query}"
    end

    render 'login', layout: false
  end

  def auth_logout
    response = Faraday.post(openid_config[:end_session_endpoint]) do |req|
      req.headers['Content-Type'] = 'application/x-www-form-urlencoded'
      req.body = URI.encode_www_form(client_id: keycloak_config[:client_id],
                                     client_secret: keycloak_config[:client_secret],
                                     refresh_token: session.dig(:user, :credentials, :refresh_token))
    end

    unless (200..299).include?(response.status)
      Rails.logger.error('auth_logout') { "#{response.status} - #{response.reason_phrase}: #{response.body}" }
    end

    session.delete(:user)

    redirect_to (previous = request.referer).present? ? previous : :root
  end

  # Logout callback
  def auth_callback
    auth = request.env['omniauth.auth']
    extra = auth&.extra&.to_hash || {}

    session[:user] = {
      info: extra['raw_info']&.deep_symbolize_keys,
      id_token: extra['id_token'],
      credentials: auth&.credentials&.to_hash&.deep_symbolize_keys,
    }.compact

    redirect_to (previous = session.delete(:redirect_url)).present? ? previous : :root
  end

  def status
    status = if authorized?
               :ok
             elsif current_user
               :forbidden
             else
               :unauthorized
             end

    render json: current_user || {}, status: status
  end
end
