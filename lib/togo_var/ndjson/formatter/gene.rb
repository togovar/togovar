module TogoVar
  module Ndjson
    module Formatter
      module Gene
        # @return [Hash]
        def update_action
          {
            update: {
              _index: 'gene',
              _id: Digest::SHA512.hexdigest(field(:hgnc_id))
            }
          }
        end

        # @return [Hash]
        def data
          alias_symbol = field(:alias_symbol).presence&.sub('"', '')&.split('|').presence
          alias_name = field(:alias_name)&.sub('"', '')&.split('|').presence
          aliases = if alias_symbol && alias_name
                      alias_symbol.zip(alias_name).map { |symbol, name| { symbol: symbol, name: name } }
                    end

          gene_family_id = field(:gene_family_id)&.sub('"', '')&.split('|')&.map { |x| Integer(x) }.presence
          gene_family = field(:gene_family)&.sub('"', '')&.split('|').presence
          families = if gene_family_id && gene_family
                       gene_family_id.zip(gene_family).map { |id, name| { id: id, name: name } }
                     end

          {
            doc_as_upsert: true,
            doc: {
              id: Integer(field(:hgnc_id).sub('HGNC:', '')),
              symbol: field(:symbol).presence,
              name: field(:name).presence,
              location: field(:location).presence,
              alias: aliases,
              family: families
            }.compact
          }
        end
      end
    end
  end
end
