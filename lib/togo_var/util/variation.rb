module TogoVar
  module Util
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

        include Vocabulary

        # @param [Integer] pos position in VCF
        # @param [String] ref reference allele in VCF
        # @param [String] alt alternative allele in VCF
        # @return [Array] start, stop, ref, alt
        def vcf_to_faldo_location(chrom, pos, ref, alt)
          statements = []

          start, stop, _ref, _alt = vcf_to_refsnp_location(pos, ref, alt)

          bn_location = ::RDF::Node.new

          case
          when ref.length == alt.length && ref.length == 1, # SNV
            statements << [bn_location, ::RDF.type, FALDO.ExactPosition]
          when ref.length == alt.length && ref.length > 1 # substitution
            statements << [bn_location, ::RDF.type, FALDO.Region]
          when ref.length == 1 && ref[0] == alt[0] # insertion
            statements << [bn_location, ::RDF.type, FALDO.InBetweenPosition]
          else
            statements << [bn_location, ::RDF.type, FALDO.Region]
          end

          if ref.length == alt.length && ref.length == 1 # SNV
            statements << [bn_location, FALDO.position, start]
            statements << [bn_location, FALDO.reference, HCO[chrom] / 'GRCh37']
          elsif ref.length == 1 && ref[0] == alt[0] # insertion
            statements << [bn_location, FALDO.after, start]
            statements << [bn_location, FALDO.before, stop]
            statements << [bn_location, FALDO.reference, HCO[chrom] / 'GRCh37']
          else
            statements << [bn_location, FALDO.start, (bn_begin = ::RDF::Node.new)]
            statements << [bn_begin, ::RDF.type, FALDO.ExactPosition]
            statements << [bn_begin, FALDO.position, start]
            statements << [bn_begin, FALDO.reference, HCO[chrom] / 'GRCh37']

            statements << [bn_location, FALDO.end, (bn_end = ::RDF::Node.new)]
            statements << [bn_end, ::RDF.type, FALDO.ExactPosition]
            statements << [bn_end, FALDO.position, stop]
            statements << [bn_end, FALDO.reference, HCO[chrom] / 'GRCh37']
          end

          statements
        end
      end
    end
  end
end
