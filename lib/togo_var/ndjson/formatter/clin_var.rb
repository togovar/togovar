module TogoVar
  module Ndjson
    module Formatter
      module ClinVar
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
          {
            doc_as_upsert: true,
            doc: {
              clinvar: {
                variation_id: Integer(id),
                allele_id: info['ALLELEID']&.presence,
                medgen: Array(info['CLNDISDB'])
                          .filter { |x| x.match?(/^MedGen:/) }
                          .map { |x| x.split(':').last }
                          .uniq
                          .presence,
                interpretation: Array(info['CLNSIG'])
                                  .flat_map { |x| x.split('/') }
                                  .map { |x| x.gsub('_', ' ').strip.downcase }
                                  .presence
              }.compact
            }
          }
        end
      end
    end
  end
end
