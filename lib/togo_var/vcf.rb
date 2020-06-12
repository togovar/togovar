require 'bio-vcf'
require 'bio-vcf/vcffile'

module BioVcf
  class VcfRecord
    attr_reader :fields
    attr_accessor :record_number

    # @return [Array] Array of [start, stop, ref, alt] for each alternative alleles
    def to_refsnp_location
      TogoVar::Util::Variation.vcf_to_refsnp_location(pos, ref, alt.first)
    end
  end
end

module TogoVar
  class VCF
    def initialize(filename)
      @filename = filename
    end

    def each
      return enum_for(:each) unless block_given?

      io = if @filename.match?(/\.gz$/)
             MultiGZipReader.open(@filename)
           else
             File.open(@filename)
           end

      header = BioVcf::VcfHeader.new

      record_number = 0

      io.each_line do |line|
        line.chomp!

        if line =~ /^##fileformat=/
          header.add(line)
          next
        end
        if line =~ /^#/
          header.add(line)
          next
        end

        fields = BioVcf::VcfLine.parse(line)
        rec = BioVcf::VcfRecord.new(fields, header)
        rec.record_number = (record_number += 1)

        yield rec
      end
    end
  end
end
