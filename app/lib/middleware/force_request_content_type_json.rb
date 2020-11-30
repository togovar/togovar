# frozen_string_literal: true

class ForceRequestContentTypeJson
  def initialize(app)
    @app = app
  end

  def call(env)
    env['CONTENT_TYPE'] = 'application/json' if env['CONTENT_TYPE'] == 'application/x-www-form-urlencoded'

    @app.call(env)
  end
end
