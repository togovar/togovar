# frozen_string_literal: true

module Errors
  class QueryParseError < ServiceError
    def initialize(msg = nil, errors: [])
      super(msg, errors: errors, status: :bad_request)
    end
  end
end
