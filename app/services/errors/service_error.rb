# frozen_string_literal: true

module Errors
  class ServiceError < StandardError
    attr_reader :errors
    attr_reader :status

    def initialize(msg = nil, errors: [], status: :internal_server_error)
      super(msg)
      @errors = errors
      @status = status
    end
  end
end
