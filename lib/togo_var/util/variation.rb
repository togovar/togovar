module TogoVar::Util
  class Variation
    class << self
      # @param [Integer] pos position in VCF
      # @param [String] ref reference allele in VCF
      # @param [String] alt alternative allele in VCF
      # @return [Array] start, stop, ref, alt
      def vcf_to_refsnp_location(pos, ref, alt)
        return [pos, pos + ref.length - 1, ref, alt] if ref.length == alt.length # SNV, substitution

        if ref.length == 1 && ref[0] == alt[0] # insertion
          [pos, pos + 1, ref.slice(1..-1) || '', alt.slice(1..-1) || '']
        elsif alt.length == 1 && ref[0] == alt[0] # deletion
          [pos + 1, pos + ref.length - 1, ref.slice(1..-1) || '', alt.slice(1..-1) || '']
        else # indel
          if ref[0] == alt[0]
            [pos + 1, pos + ref.length - 1, ref.slice(1..-1) || '', alt.slice(1..-1) || '']
          else
            [pos, pos + ref.length - 1, ref, alt]
          end
        end
      end
    end
  end
end
