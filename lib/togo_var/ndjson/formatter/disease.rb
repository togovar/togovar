module TogoVar
  module Ndjson
    module Formatter
      module Disease
        # @return [Hash]
        def update_action
          {
            update: {
              _index: 'disease',
              _id: Digest::SHA512.hexdigest(field(:cui))
            }
          }
        end

        # @return [Hash]
        def data
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
