# frozen_string_literal: true

require_relative 'boot'

require 'rails'
# Pick the frameworks you want:
require 'active_model/railtie'
require 'active_job/railtie'
# require "active_record/railtie"
# require "active_storage/engine"
require 'action_controller/railtie'
# require "action_mailer/railtie"
# require "action_mailbox/engine"
# require "action_text/engine"
require 'action_view/railtie'
# require "action_cable/engine"
# require "sprockets/railtie"
# require "rails/test_unit/railtie"

# Require the gems listed in Gemfile, including any gems
# you've limited to :test, :development, or :production.
Bundler.require(*Rails.groups)

module TogoVar
  class Application < Rails::Application
    # Initialize configuration defaults for originally generated Rails version.
    config.load_defaults 6.0

    # Settings in config/environments/* take precedence over those specified here.
    # Application configuration can go into files in config/initializers
    # -- all .rb files in that directory are automatically loaded after loading
    # the framework and any gems in your application.

    # Only loads a smaller set of middleware suitable for API only apps.
    # Middleware like session, flash, cookies can be added back manually.
    # Skip views, helpers and assets when generating a new resource.
    config.api_only = true

    config.middleware.use ActionDispatch::Cookies
    config.middleware.use ActionDispatch::Session::RedisStore,
                          servers: [
                            "redis://#{ENV.fetch('TOGOVAR_REDIS_HOST', 'localhost')}:#{ENV.fetch('TOGOVAR_REDIS_HOST', '6379')}/0/session"
                          ],
                          expire_after: begin
                                          Integer(ENV.fetch('TOGOVAR_REDIS_SESSION_EXPIRE'))
                                        rescue => e
                                          warn "#{e.message} at #{e.backtrace.first}"
                                          1.day
                                        end,
                          key: "_#{Rails.application.class.module_parent_name.underscore}_session",
                          threadsafe: true,
                          secure: Rails.env.production?

    if Rails.env.development?
      config.middleware.insert(0, Rack::ReverseProxy) do
        reverse_proxy_options preserve_host: true
        reverse_proxy %r{^/$}, 'http://localhost:8000/index.html'
        reverse_proxy %r{^/(\?.*)$}, 'http://localhost:8000/index.html$1'
        reverse_proxy %r{^/((css|js|images|fonts|variant|gene|disease|doc)/.*)$}, 'http://localhost:8000/$1'
      end
    end

    config.elasticsearch = config_for(:elasticsearch)
    config.endpoint = config_for(:endpoint)
    config.virtuoso = config_for(:virtuoso)

    config.application = config_for(:application)[ENV.fetch('TOGOVAR_REFERENCE')]
  end
end
