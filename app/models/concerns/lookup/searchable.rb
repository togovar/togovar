class Lookup
  module Searchable
    extend ActiveSupport::Concern

    included do
      include Elasticsearch::Model
      # include Elasticsearch::Model::Callbacks

      index_name "lookup_#{Rails.env}"

      # document_type "lookup_#{Rails.env}"

      settings do
        mappings dynamic: false do
          indexes :tgv_id,
                  type: 'text'

          indexes :base do
            indexes :chromosome,
                    type: 'text'

            indexes :position,
                    type: 'integer'

            indexes :allele,
                    type: 'text'

            indexes :existing_variation,
                    type: 'text'

            indexes :variant_class,
                    type:      'text',
                    fielddata: true
          end

          indexes :molecular_annotation do
            indexes :gene,
                    type: 'text'

            indexes :symbol,
                    type: 'text'

            indexes :transcripts, type: 'nested' do
              indexes :impact,
                      type: 'text'

              indexes :hgvsc,
                      type: 'text'

              indexes :consequences, type: 'nested' do
                indexes :id,
                        type: 'text'

                indexes :label,
                        type: 'text'
              end

              indexes :sift do
                indexes :prediction,
                        type: 'text'

                indexes :value,
                        type: 'float'
              end

              indexes :polyphen do
                indexes :prediction,
                        type: 'text'

                indexes :value,
                        type: 'float'
              end
            end
          end

          indexes :clinvar_info do
            indexes :allele_id,
                    type: 'integer'

            indexes :significance,
                    type:      'text',
                    fielddata: true

            indexes :conditions,
                    type:      'text',
                    fielddata: true
          end

          indexes :clinvar do
            indexes :num_alt_alleles,
                    type: 'integer'

            indexes :num_alleles,
                    type: 'integer'

            indexes :frequency,
                    type: 'float'
          end

          indexes :jga do
            indexes :num_alt_alleles,
                    type: 'integer'

            indexes :num_alleles,
                    type: 'integer'

            indexes :frequency,
                    type: 'float'
          end
        end
      end
    end

    module ClassMethods
      def elasticsearch
        __elasticsearch__
      end

      def client
        elasticsearch.client
      end
    end

    def as_indexed_json(options = {})
      as_json(except: %i[id _id])
    end
  end
end