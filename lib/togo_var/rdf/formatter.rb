module TogoVar
  module RDF
    class Formatter
      class << self
        def for(data_source)
          formatter = new

          case data_source
          when :vep
            class << formatter
              include TogoVar::DataSource::VEP::RDFExtension
            end
          else
            raise ArgumentError, "Unknown format: #{data_source}"
          end

          formatter
        end
      end

      attr_accessor :record
    end
  end
end
