# frozen_string_literal: true

module TogoVar
  module API
    class VariationSearch
      module Defaults
        VERSION = '1'
      end

      attr_accessor :options

      # @param [Array] args
      # @option args [String] :version
      def initialize(*args)
        @hash = args.last.is_a?(Hash) ? args.pop : {}
        @args = args
        @version = @hash.fetch(:version, Defaults::VERSION)
        @options = {}
      end

      def model
        model = Models::Version1::VariationSearch.new(*@args, **@hash)
        model.options = options

        model
      end
    end
  end
end
