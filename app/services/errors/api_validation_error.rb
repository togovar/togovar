# frozen_string_literal: true

module Errors
  class APIValidationError < ServiceError
    def initialize(msg = nil, errors: [])
      super(msg, errors: errors, status: :bad_request)
    end
  end
end
