module TogoVar::IO::VCF::VEP
  CONSEQUENCE_KEYS = %w[Allele Consequence IMPACT SYMBOL Gene Feature_type Feature BIOTYPE EXON INTRON HGVSc HGVSp
                      cDNA_position CDS_position Protein_position Amino_acids Codons Existing_variation DISTANCE
                      STRAND FLAGS VARIANT_CLASS SYMBOL_SOURCE HGNC_ID SIFT PolyPhen HGVS_OFFSET HGVSg CLIN_SIG
                      SOMATIC PHENO].freeze

  CHROM_INDEX = ('1'..'22').to_a.concat(%w[X Y MT]).zip((1..25)).to_h

  REAL_NUMBER_REGEX = /[+-]?(?:\d+\.?\d*|\.\d+)/

  module ElasticsearchExtension
    # @param [BioVcf::VcfRecord] record
    # @return [Hash]
    def update_action(record)
      {
        update: {
          _index: 'variation',
          _id: Digest::SHA512.hexdigest("#{record.chrom}-#{record.pos}-#{record.ref}-#{record.alt.first}")
        }
      }
    end

    # @param [BioVcf::VcfRecord] record
    # @return [Hash]
    def data(record)
      consequences = Array(record.info['CSQ']).map { |x| CONSEQUENCE_KEYS.zip(x.split('|')).to_h }
      variant_class = consequences.map { |x| x['VARIANT_CLASS'] }.uniq

      raise "Failed to obtain variant class" if variant_class.size.zero?
      raise "Variant class conflicts: #{variant_class}" unless variant_class.size == 1

      xref = consequences.flat_map { |x| x['Existing_variation'].split('&') }
               .reject(&:blank?)
               .compact
               .uniq
               .filter { |x| x.match?(/^rs\d+$/) }

      start, stop, ref, alt = record.to_tgv_representation

      {
        doc: {
          id: record.id == '.' ? nil : Integer(record.id.sub(/^tgv/, '')),
          type: variant_class.first,
          chromosome: {
            index: CHROM_INDEX[record.chrom],
            label: record.chrom
          },
          start: start,
          stop: stop,
          reference: ref,
          alternative: alt,
          vcf: {
            position: record.pos,
            reference: record.ref,
            alternative: record.alt.first
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

  def self.included(mod)
    include ElasticsearchExtension
  end
end
