module TogoVar
  module Ndjson
    module Formatter
      module Disease
        # @return [Array<Hash>]
        def requests
          [action_and_meta_data, optional_source]
        end

        # @return [Hash]
        def action_and_meta_data
          {
            update: {
              _index: 'disease',
              _id: Digest::SHA512.hexdigest(field(:cui)),
              retry_on_conflict: 3
            }
          }
        end

        # @return [Hash]
        def optional_source
          {
            doc_as_upsert: true,
            doc: {
              id: field(:cui).presence,
              name: field(:name).presence,
              source: field(:source).presence,
            }.compact
          }
        end
      end
    end
  end
end
