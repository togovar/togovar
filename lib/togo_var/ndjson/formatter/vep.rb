module TogoVar
  module Ndjson
    module Formatter
      module VEP
        # @return [Hash]
        def update_action
          {
            update: {
              _index: 'variation',
              _id: Digest::SHA512.hexdigest("#{chrom}-#{pos}-#{ref}-#{alt.first}")
            }
          }
        end

        # @return [Hash]
        def data
          consequences = Array(info['CSQ']).map { |x| CONSEQUENCE_KEYS.zip(x.split('|')).to_h }
          variant_class = consequences.map { |x| x['VARIANT_CLASS'] }.uniq

          raise "Failed to obtain variant class" if variant_class.size.zero?
          raise "Variant class conflicts: #{variant_class}" unless variant_class.size == 1

          xref = consequences.flat_map { |x| x['Existing_variation'].split('&') }
                   .reject(&:blank?)
                   .compact
                   .uniq
                   .filter { |x| x.match?(/^rs\d+$/) }

          start, stop, ref, alt = to_refsnp_location

          {
            doc: {
              id: id == '.' ? nil : Integer(id.sub(/^tgv/, '')),
              type: variant_class.first,
              chromosome: {
                index: CHROM_INDEX[chrom],
                label: chrom
              },
              start: start,
              stop: stop,
              reference: ref,
              alternative: alt,
              vcf: {
                position: pos,
                reference: ref,
                alternative: alt.first
              },
              xref: xref.map do |x|
                {
                  source: 'dbSNP',
                  id: x
                }
              end,
              vep: consequences.map do |csq|
                {
                  transcript_id: csq['Feature'].presence,
                  consequence: csq['Consequence'].presence&.split('&'),
                  gene_id: csq['Gene'].presence,
                  hgnc_id: csq['HGNC_ID'].present? ? Integer(csq['HGNC_ID']) : nil,
                  symbol: {
                    source: csq['SYMBOL_SOURCE'].presence,
                    label: csq['SYMBOL'].presence
                  },
                  hgvs_c: csq['HGVSc'].presence,
                  hgvs_p: csq['HGVSp'].presence,
                  hgvs_g: csq['HGVSg'].presence,
                  sift: (m = REGEX::REAL_NUMBER.match(csq['SIFT'])).present? ? Float(m[0]) : nil,
                  polyphen: (m = REGEX::REAL_NUMBER.match(csq['PolyPhen'])).present? ? Float(m[0]) : nil
                }.compact
              end
            }.compact
          }
        end
      end
    end
  end
end
