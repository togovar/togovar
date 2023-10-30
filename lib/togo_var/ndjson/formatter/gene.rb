module TogoVar
  module Ndjson
    module Formatter
      module Gene
        # @return [Array<Hash>]
        def bulk_requests
          optional_source.flat_map { |source| [action, source] }
        end

        # @return [Hash]
        def action
          {
            index: {
              _index: 'gene',
              retry_on_conflict: 3
            }
          }
        end

        # @return [Array<Hash>]
        def optional_source
          gene_family_id = field(:gene_group_id)&.sub('"', '')&.split('|')&.map { |x| Integer(x) }.presence
          gene_family = field(:gene_group)&.sub('"', '')&.split('|').presence
          families = if gene_family_id && gene_family
                       gene_family_id.zip(gene_family).map { |id, name| { id: id, name: name } }
                     end

          approved = {
            hgnc_id: Integer(field(:hgnc_id).sub('HGNC:', '')),
            symbol: (approved_symbol = field(:symbol).presence),
            approved: true,
            name: field(:name).presence,
            location: field(:location).presence,
            family: families
          }

          alias_symbol = field(:alias_symbol).presence&.sub('"', '')&.split('|')

          aliases = if alias_symbol.present?
                      alias_symbol.map do |symbol|
                        approved.merge({
                                         symbol: symbol,
                                         approved: false,
                                         alias_of: approved_symbol
                                       }.compact)
                      end
                    end

          Array(aliases).unshift(approved)
        end
      end
    end
  end
end
