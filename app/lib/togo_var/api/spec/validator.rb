# frozen_string_literal: true

module TogoVar
  module API
    module Spec
      class Validator
        attr_reader :errors

        # @param [Hash] schema
        # @param [Hash] options
        # @option options [Symbol] :method Request method
        # @option options [String] :path Request path
        # @option options [Hash] :parameters Request query parameters
        # @option options [Hash] :headers Request headers
        # @option options [Hash] :body Request body
        def initialize(schema, **options)
          @schema = schema
          @options = options

          @errors = []
        end

        # @return [FalseClass, TrueClass]
        def valid?
          validate!
        rescue OpenAPIParser::OpenAPIError
          false
        end

        alias validate valid?

        # @return [TrueClass]
        # @raise [OpenAPIParser::OpenAPIError] if the request is invalid
        def validate!
          errors.clear

          validate_path_params!
          validate_request_body!

          true
        end

        protected

        def validate_path_params!
          operation&.validate_request_parameter(request_parameters, request_headers)
        rescue OpenAPIParser::OpenAPIError => e
          errors << e.message.gsub('"', "'")
          raise e
        end

        def validate_request_body!
          operation&.validate_request_body(request_headers[:content_type], request_body)
        rescue OpenAPIParser::OpenAPIError => e
          errors << e.message.gsub('"', "'")
          raise e
        end

        def operation
          @operation ||= root.request_operation(request_method, request_path)
        end

        def root
          OpenAPIParser.parse(@schema)
        end

        private

        def request_method
          if (m = @options[:method]).is_a?(String)
            m.downcase.to_sym
          else
            m || :get
          end
        end

        def request_path
          @options[:path] || '/'
        end

        def request_parameters
          @options[:parameters] || {}
        end

        def request_headers
          @options[:headers] || {}
        end

        def request_body
          body = @options[:body] || {}
          array_or_hash = (body.is_a?(String) ? JSON.parse(body) : body).deep_transform_keys(&:to_s)

          Hash[array_or_hash]
        end
      end
    end
  end
end
