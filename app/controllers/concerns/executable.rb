# frozen_string_literal: true

module Executable
  extend ActiveSupport::Concern

  # @param [#execute] service
  # @return [Array] [result, status]
  def execute(service)
    [service.execute, 200]
  rescue Errors::ServiceError => e
    [{ errors: e.errors }, e.status]
  rescue StandardError => e
    Rails.logger.error(self.class.name) { [e.message].concat(e.backtrace).join("\n") }
    raise e if Rails.env.development?
    [{ errors: [e.message] }, :internal_server_error]
  end
end
