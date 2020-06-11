module TogoVar::Elasticsearch
  class BulkDataBuilder
    class << self
      def for(format)
        builder = new

        case format
        when :vep
          class << builder
            include TogoVar::DataSource::VEP::ElasticsearchExtension
          end
        when :clinvar
          class << builder
            include TogoVar::DataSource::Clinvar::ElasticsearchExtension
          end
        else
          raise ArgumentError, "Unknown format: #{format}"
        end

        builder
      end
    end

    attr_accessor :record
  end
end
