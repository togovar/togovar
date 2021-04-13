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
    error { Array(e.backtrace).unshift(e.to_s).join("\n") }
    [{ errors: [e.message] }, :internal_server_error]
  end
end
