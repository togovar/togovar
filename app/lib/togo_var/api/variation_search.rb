# frozen_string_literal: true

module TogoVar
  module API
    class VariationSearch
      module Defaults
        VERSION = '1'
      end

      # @param [Array] args
      # @option args [String] :version
      def initialize(*args)
        @hash = args.last.is_a?(Hash) ? args.pop : {}
        @args = args
        @version = @hash.fetch(:version, Defaults::VERSION)
      end

      def model
        # switch parser by body[:version]
        Models::Version1::VariationSearch.new(*@args, **@hash)
      end
    end
  end
end
