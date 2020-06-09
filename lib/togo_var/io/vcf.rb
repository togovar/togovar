require 'bio-vcf'
require 'bio-vcf/vcffile'

module BioVcf
  class VcfRecord
    # @return [Array<Array>] Array of [start, stop, ref, alt] for each alternative alleles
    def to_tgv_representation
      TogoVar::Util::Variation.vcf_to_refsnp_location(pos, ref, alt.first)
    end
  end
end

module TogoVar::IO
  class VCF
    class << self
      require 'togo_var/io/vcf/clinvar'
      require 'togo_var/io/vcf/vep'

      # @param [Symbol] format
      def for(path, format)
        reader = self.new(path)

        if format == :vep
          class << reader
            include VEP
          end
        elsif format == :clinvar
          class << reader
            include Clinvar
          end
        end

        reader
      end
    end

    def initialize(path)
      @reader = BioVcf::VCFfile.new(file: path, is_gz: path.match?(/\.gz$/))
    end

    def each(&_block)
      return enum_for(:each) unless block_given?

      @record_num = 0

      @reader.each do |record|
        @header ||= record.header

        raise 'Multi allelic variation' if record.alt.size > 1

        yield record, (@record_num += 1)
      end
    end

    def headers
      (@header ||= @reader.each.first&.header)&.lines
    end
  end
end
