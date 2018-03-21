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

    include TermType

    module ClassMethods
      def list(params)
        term   = term_type((params['term'] || '').strip)
        start  = (params['start'] || 0).to_i
        length = (params['length'] || 10).to_i

        query = if term
                  term.query.merge(size: length, from: start)
                else
                  { size: length,
                    from: start }
                end

        result    = search(query)
        hit_count = result['hits']['total']
        sources   = result['hits']['hits'].map { |x| x['_source'] }
        total     = client.count(index: index_name)

        # FIXME: insert SO label into base.variant_class
        replace = sources.map do |r|
          json = r.as_json
          if (base = r['base'])
            if (var_class = base['variant_class'])
              base['variant_class'] = SequenceOntology.find(var_class.tr(':', '_')).label
              json.merge(base: base)
            else
              json
            end
          else
            json
          end
        end

        replace.each do |r|
          next unless (m = r['molecular_annotation'])
          if (t = m['transcripts'])
            r['molecular_annotation']['transcripts'] = select_most_severe_consequence(t)
          end
        end

        filter_count = term ? hit_count : total['count']

        { recordsTotal:    total['count'],
          recordsFiltered: filter_count,
          data:            replace }
      end

      def search(query)
        client.search(index: index_name, body: query)
      end

      def count(query)
        if (r = search(query))
          if (h = r['hits'])
            h['total']
          end
        end
        0
      end

      CONSEQUENCES_ORDER = %w[SO:0001893 SO:0001574 SO:0001575 SO:0001587
                              SO:0001589 SO:0001578 SO:0002012 SO:0001889
                              SO:0001821 SO:0001822 SO:0001583 SO:0001818
                              SO:0001630 SO:0001626 SO:0001567 SO:0001819
                              SO:0001580 SO:0001620 SO:0001623 SO:0001624
                              SO:0001792 SO:0001627 SO:0001621 SO:0001619
                              SO:0001631 SO:0001632 SO:0001895 SO:0001892
                              SO:0001782 SO:0001894 SO:0001891 SO:0001907
                              SO:0001566 SO:0001906 SO:0001628].freeze

      def select_most_severe_consequence(transcripts)
        CONSEQUENCES_ORDER.each do |so|
          t = transcripts.select do |x|
            if (c = x['consequences'])
              c.map { |y| y['id'] == so }.any?
            end
          end
          return t if t.present?
        end
        transcripts
      end

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