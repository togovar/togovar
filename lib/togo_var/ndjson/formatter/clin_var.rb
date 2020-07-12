module TogoVar
  module Ndjson
    module Formatter
      module ClinVar
        # @return [Array<Hash>]
        def requests
          [action_and_meta_data, optional_source]
        end

        # @return [Hash]
        def action_and_meta_data
          {
            update: {
              _index: 'variation',
              _id: Digest::SHA512.hexdigest("#{chrom}-#{pos}-#{ref}-#{alt.first}"),
              retry_on_conflict: 3
            }
          }
        end

        # @return [Hash]
        def optional_source
          {
            doc_as_upsert: true,
            doc: {
              clinvar: {
                variation_id: Integer(id),
                allele_id: info['ALLELEID']&.presence,
              }.compact
            }
          }
        end
      end
    end
  end
end
