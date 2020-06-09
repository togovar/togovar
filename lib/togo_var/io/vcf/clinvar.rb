module TogoVar::IO::VCF::Clinvar
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
      variation_id = record.info['VariantID']
      allele_id = record.info['ALLELEID']

      return nil if variation_id.blank? && allele_id.blank?

      {
        doc: {
          clinvar: {
            variation_id: variation_id.present? ? Integer(variation_id) : nil,
            allele_id: allele_id.present? ? Integer(allele_id) : nil
          }.compact
        }
      }
    end
  end

  def self.included(mod)
    include ElasticsearchExtension
  end
end
