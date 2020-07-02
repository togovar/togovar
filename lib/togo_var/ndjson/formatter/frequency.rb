module TogoVar
  module Ndjson
    module Formatter
      module Frequency
        # @return [Array<Hash>]
        def requests
          [action_and_meta_data, optional_source]
        end

        # @return [Hash]
        def action_and_meta_data
          {
            update: {
              _index: 'variation',
              _id: Digest::SHA512.hexdigest("#{chrom}-#{pos}-#{ref}-#{alt.first}")
            }
          }
        end

        # @return [Hash]
        def optional_source
          genotype = {
            alt_homo_count: (v = info['AAC']).present? ? Integer(v) : nil,
            hetero_count: (v = info['ARC']).present? ? Integer(v) : nil,
            ref_homo_count: (v = info['RRC']).present? ? Integer(v) : nil
          }.compact.presence

          {
            scripted_upsert: true,
            upsert: {},
            script: {
              source: 'if (ctx._source.frequency == null) { ctx._source.frequency = [] } ctx._source.frequency.add(params.doc)',
              lang: 'painless',
              params: {
                doc: {
                  source: source,
                  filter: filter == '.' ? nil : filter.split(';').map { |x| x.match?(/^pass$/i) ? 'PASS' : x }.presence,
                  quality: qual,
                  allele: {
                    count: Integer(info['AC'] || info['AC_Adj'] || 0),
                    number: Integer(info['AN'] || info['AN_Adj'] || 0),
                    frequency: Float(info['AF'] || info['AF_Adj'] || 0)
                  },
                  genotype: genotype
                }.compact
              }
            }
          }
        end
      end
    end
  end
end
