module TogoVar
  module Ndjson
    module Formatter
      module Gene
        # @return [Array<Hash>]
        def requests
          optional_source.flat_map { |source| [action_and_meta_data(source.dig(:doc, :symbol)), source] }
        end

        # @return [Hash]
        def action_and_meta_data(symbol)
          {
            update: {
              _index: 'gene',
              _id: Digest::SHA512.hexdigest("#{field(:hgnc_id)}/#{symbol}")
            }
          }
        end

        # @return [Array<Hash>]
        def optional_source
          gene_family_id = field(:gene_family_id)&.sub('"', '')&.split('|')&.map { |x| Integer(x) }.presence
          gene_family = field(:gene_family)&.sub('"', '')&.split('|').presence
          families = if gene_family_id && gene_family
                       gene_family_id.zip(gene_family).map { |id, name| { id: id, name: name } }
                     end

          approved = {
            doc_as_upsert: true,
            doc: {
              hgnc_id: Integer(field(:hgnc_id).sub('HGNC:', '')),
              symbol: (approved_symbol = field(:symbol).presence),
              approved: true,
              name: field(:name).presence,
              location: field(:location).presence,
              family: families
            }.compact
          }

          alias_symbol = field(:alias_symbol).presence&.sub('"', '')&.split('|').presence
          alias_name = field(:alias_name)&.sub('"', '')&.split('|').presence

          aliases = if alias_symbol && alias_name
                      alias_symbol.zip(alias_name).map do |symbol, name|
                        approved.deep_merge doc: {
                          symbol: symbol,
                          approved: false,
                          name: name,
                          alias_of: approved_symbol
                        }.compact
                      end
                    end

          Array(aliases).unshift(approved)
        end
      end
    end
  end
end
