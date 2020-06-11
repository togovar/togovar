module TogoVar::DataSource::VEP
  module ElasticsearchExtension
    # @return [Hash]
    def update_action
      {
        update: {
          _index: 'variation',
          _id: Digest::SHA512.hexdigest("#{@record.chrom}-#{@record.pos}-#{@record.ref}-#{@record.alt.first}")
        }
      }
    end

    # @return [Hash]
    def data
      consequences = Array(@record.info['CSQ']).map { |x| CONSEQUENCE_KEYS.zip(x.split('|')).to_h }
      variant_class = consequences.map { |x| x['VARIANT_CLASS'] }.uniq

      raise "Failed to obtain variant class" if variant_class.size.zero?
      raise "Variant class conflicts: #{variant_class}" unless variant_class.size == 1

      xref = consequences.flat_map { |x| x['Existing_variation'].split('&') }
               .reject(&:blank?)
               .compact
               .uniq
               .filter { |x| x.match?(/^rs\d+$/) }

      start, stop, ref, alt = @record.to_refsnp_location

      {
        doc: {
          id: @record.id == '.' ? nil : Integer(@record.id.sub(/^tgv/, '')),
          type: variant_class.first,
          chromosome: {
            index: CHROM_INDEX[@record.chrom],
            label: @record.chrom
          },
          start: start,
          stop: stop,
          reference: ref,
          alternative: alt,
          vcf: {
            position: @record.pos,
            reference: @record.ref,
            alternative: @record.alt.first
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
              sift: (m = REAL_NUMBER_REGEX.match(csq['SIFT'])).present? ? Float(m[0]) : nil,
              polyphen: (m = REAL_NUMBER_REGEX.match(csq['PolyPhen'])).present? ? Float(m[0]) : nil
            }.compact
          end
        }.compact
      }
    end
  end
end
