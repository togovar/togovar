# frozen_string_literal: true

module Middleware
  class ForceRequestContentTypeJson
    def initialize(app)
      @app = app
    end

    def call(env)
      type = env['CONTENT_TYPE']

      env['CONTENT_TYPE'] = 'application/json' if type.blank? || type == 'application/x-www-form-urlencoded'

      @app.call(env)
    end
  end
end
