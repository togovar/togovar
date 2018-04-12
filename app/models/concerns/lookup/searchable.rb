class Lookup
  module Searchable
    extend ActiveSupport::Concern

    included do
      include Elasticsearch::Model
      # include Elasticsearch::Model::Callbacks

      index_name "lookup_#{Rails.env}"

      # document_type "lookup_#{Rails.env}"

      settings index: { number_of_shards: 3, number_of_replicas: 0 } do
        mappings dynamic: false, _all: { enabled: false } do
          indexes :tgv_id,
                  type: 'integer'

          indexes :chromosome,
                  type: 'keyword'

          indexes :start,
                  type: 'integer'

          indexes :stop,
                  type: 'integer'

          indexes :variant_type,
                  type: 'keyword'

          indexes :reference,
                  type: 'keyword'

          indexes :alternative,
                  type: 'keyword'

          indexes :rs,
                  type: 'keyword'

          indexes :gene,
                  type: 'keyword'

          indexes :symbol,
                  type: 'keyword'

          indexes :symbol_source,
                  type: 'keyword'

          indexes :hgvs_g,
                  type: 'keyword'

          indexes :transcripts, type: 'nested' do
            indexes :consequences,
                    type: 'keyword'

            indexes :hgvs_c,
                    type: 'keyword'

            indexes :sift,
                    type: 'float'

            indexes :polyphen,
                    type: 'float'
          end

          indexes :clinvar do
            indexes :allele_id,
                    type: 'integer'

            indexes :significance,
                    type: 'keyword'

            indexes :conditions,
                    type:   'text',
                    fields: {
                      raw: {
                        type: 'keyword'
                      }
                    }
          end

          indexes :exac do
            indexes :num_alt_alleles,
                    type: 'integer'

            indexes :num_alleles,
                    type: 'integer'

            indexes :frequency,
                    type: 'float'

            indexes :passed,
                    type: 'boolean'
          end

          indexes :hgvd do
            indexes :num_alt_alleles,
                    type: 'integer'

            indexes :num_alleles,
                    type: 'integer'

            indexes :frequency,
                    type: 'float'
          end

          indexes :jga_ngs do
            indexes :num_alt_alleles,
                    type: 'integer'

            indexes :num_alleles,
                    type: 'integer'

            indexes :frequency,
                    type: 'float'

            indexes :quality_score,
                    type: 'float'

            indexes :passed,
                    type: 'boolean'
          end

          indexes :jga_snp do
            indexes :num_alt_alleles,
                    type: 'integer'

            indexes :num_alleles,
                    type: 'integer'

            indexes :frequency,
                    type: 'float'

            indexes :genotype_ref_hom,
                    type: 'integer'

            indexes :genotype_alt_hom,
                    type: 'integer'

            indexes :genotype_het,
                    type: 'integer'
          end

          indexes :tommo do
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
        Rails.logger.info('term: ' + term.inspect)
        start  = (params['start'] || 0).to_i
        length = (params['length'] || 10).to_i

        query = { size: length,
                  from: start,
                  aggs: {
                    total_variant_type: {
                      terms: {
                        field: 'variant_type'
                      }
                    }
                  } }

        if term
          query.merge!(term.query)
        end

        Rails.logger.info(query)
        result    = search(query)
        hit_count = result['hits']['total']
        sources   = result['hits']['hits'].map { |x| x['_source'] }
        total     = client.count(index: index_name)

        total_variant_type = result['aggregations']['total_variant_type']['buckets'].map do |t|
          [SequenceOntology.find(t['key']).label.downcase, t['doc_count']]
        end.to_h

        # FIXME: insert SO label into base.variant_class
        replace = sources.map do |r|
          json = r.as_json
          if (var_class = json['variant_type'])
            json['variant_type'] = SequenceOntology.find(var_class).label
          end
          if (tr = json['transcripts'])
            json['transcripts'] = select_most_severe_consequence(tr)
            json['transcripts'].each do |t|
              t['consequences'] = t['consequences'].map do |c|
                SequenceOntology.find(c).label
              end
            end
          end
          json
        end

        filter_count = term ? hit_count : total['count']

        { recordsTotal:       total['count'],
          recordsFiltered:    filter_count,
          data:               replace,
          total_variant_type: total_variant_type
        }
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

      CONSEQUENCES_ORDER = %w[SO_0001893 SO_0001574 SO_0001575 SO_0001587
                              SO_0001589 SO_0001578 SO_0002012 SO_0001889
                              SO_0001821 SO_0001822 SO_0001583 SO_0001818
                              SO_0001630 SO_0001626 SO_0001567 SO_0001819
                              SO_0001580 SO_0001620 SO_0001623 SO_0001624
                              SO_0001792 SO_0001627 SO_0001621 SO_0001619
                              SO_0001631 SO_0001632 SO_0001895 SO_0001892
                              SO_0001782 SO_0001894 SO_0001891 SO_0001907
                              SO_0001566 SO_0001906 SO_0001628].freeze

      def select_most_severe_consequence(transcripts)
        CONSEQUENCES_ORDER.each do |so|
          t = transcripts.select do |x|
            if (c = x['consequences'])
              c.map { |y| y == so }.any?
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

      def import(*id)
        errors = []

        id = id.map(&:to_i)

        records = fetch(*id)
        if (m = id - records.keys).present?
          Rails.logger.warn("missing tgv_id: #{m.join(', ')} in Lookup::import")
        end

        request  = { index:   index_name,
                     type:    document_type,
                     body:    records.map { |_, v| { index: { data: v } } },
                     refresh: true }
        response = client.bulk(request)
        errors   += response['items'].select { |k, _| k.values.first['error'] }

        Rails.logger.error(errors) if errors.present?
        errors
      end
    end
  end
end