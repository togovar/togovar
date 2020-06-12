module TogoVar
  module RDF
    require 'togo_var/rdf/formatter'

    class Statements
      extend Forwardable
      include ::RDF::Enumerable

      def initialize
        super
        @array = []
      end

      def <<(data)
        @array << ::RDF::Statement(*data)
      end

      def concat(other)
        other.each { |o| self << o }
      end

      def_delegators :@array, :each
    end
  end
end

module RDF
  class Writer
    def close
      @output.close if @output.respond_to?(:close)
    end
  end
end
