class Lookup
  module Searchable
    extend ActiveSupport::Concern

    included do
      include Elasticsearch::Model
      # include Elasticsearch::Model::Callbacks

      index_name "lookup_#{Rails.env}"

      settings index: { number_of_shards: 5, number_of_replicas: 0 } do
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

          indexes :hgvs_g,
                  type: 'keyword'

          indexes :transcripts, type: 'nested' do
            indexes :ensg_id,
                    type: 'keyword'

            indexes :enst_id,
                    type: 'keyword'

            indexes :symbol,
                    type: 'keyword'

            indexes :symbol_source,
                    type: 'keyword'

            indexes :ncbi_gene_id,
                    type: 'integer'

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

            indexes :significances,
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
            indexes :num_alleles,
                    type: 'integer'

            indexes :num_alt_alleles,
                    type: 'integer'

            indexes :frequency,
                    type: 'float'

            indexes :passed,
                    type: 'boolean'
          end

          indexes :hgvd do
            indexes :num_alleles,
                    type: 'integer'

            indexes :num_alt_alleles,
                    type: 'integer'

            indexes :frequency,
                    type: 'float'

            indexes :passed,
                    type: 'boolean'
          end

          indexes :jga_ngs do
            indexes :num_alleles,
                    type: 'integer'

            indexes :num_alt_alleles,
                    type: 'integer'

            indexes :frequency,
                    type: 'float'

            indexes :quality_score,
                    type: 'float'

            indexes :passed,
                    type: 'boolean'
          end

          indexes :jga_snp do
            indexes :num_alleles,
                    type: 'integer'

            indexes :num_ref_alleles,
                    type: 'integer'

            indexes :num_alt_alleles,
                    type: 'integer'

            indexes :num_genotype_hetero,
                    type: 'integer'

            indexes :num_genotype_ref_homo,
                    type: 'integer'

            indexes :num_genotype_alt_homo,
                    type: 'integer'

            indexes :frequency,
                    type: 'float'
          end

          indexes :tommo do
            indexes :num_alleles,
                    type: 'integer'

            indexes :num_alt_alleles,
                    type: 'integer'

            indexes :frequency,
                    type: 'float'

            indexes :passed,
                    type: 'boolean'
          end
        end
      end
    end

    include TermType

    module ClassMethods
      def list(params)
        term = term_type((params['term'] || '').strip)

        if [params['source'], params['significance'], params['significance']].any?(&:blank?)
          query = { size: 0 }
        else
          start  = (params['start'] || 0).to_i
          length = (params['length'] || 10).to_i

          query = { size: length,
                    from: start,
                    sort: %w[chromosome start stop] }

          query.merge!(term.query) if term.present?

          query = filter_by_frequency(query, params)
          if params['source']
            unless params['source'].include?('source_all')
              query = filter_by_source(query, params)
            end
          end
          if params['variant_type']
            unless params['variant_type'].include?('variant_type_all')
              query = filter_by_variant_type(query, params)
            end
          end
          if params['significance']
            unless params['significance'].include?('significance_all')
              query = filter_by_significance(query, params)
            end
          end
        end

        Rails.logger.info('query term: ' + term.inspect)
        Rails.logger.info('es query: ' + query.to_json)

        result    = search(query)
        hit_count = result['hits']['total']
        sources   = result['hits']['hits'].map { |x| x['_source'] }
        total     = count_each_category(term.present? ? term.query : {})

        total_variant_type = total['aggregations']['total_variant_type']['buckets'].map do |t|
          [SequenceOntology.find(t['key']).label.downcase, t['doc_count']]
        end.to_h

        total_significance = total['aggregations']['total_significance']['buckets'].map do |t|
          [t['key'], t['doc_count']]
        end.to_h

        total_dataset = %w[jga_ngs jga_snp tommo hgvd exac clinvar].map do |d|
          [d, total['aggregations']["total_#{d}"]['doc_count']]
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

        warning_message = sources.present? && hit_count > 1_000_000 ? 'Scroll function over 1,000,000 results is currently unavailable.' : nil

        filtered_count = if sources.blank?
                           0
                         else
                           hit_count <= 1_000_000 ? hit_count : 1_000_000
                         end

        { recordsTotal:       total['hits']['total'],
          recordsFiltered:    filtered_count,
          data:               replace,
          total_variant_type: total_variant_type,
          total_significance: total_significance,
          total_dataset:      total_dataset,
          warning:            warning_message }
      end

      def search(query)
        client.search(index: index_name, body: query)
      end

      # @deprecated too slow
      def scroll(query, size, pages)
        response = client.search(index: index_name, scroll: '5m', size: size, body: query)

        (pages - 1).times do
          response = client.scroll(index: index_name, scroll_id: response['_scroll_id'], scroll: '5m',)
        end

        client.clear_scroll(index: index_name, scroll_id: response['_scroll_id'])

        response
      end

      def count(query = {})
        begin
          if (r = search(query))
            if (h = r['hits'])
              return h['total']
            end
          end
        rescue
          return 1
        end
      end

      def filter_by_source(query, params)
        source = params['source'] || []

        return query if source.empty?

        q = query.delete(:query)

        sources   = source.map { |x| { exists: { field: x } } }
        condition = [q, { bool: { should: sources } }].compact

        query.merge(query: { bool: { must: condition } })
      end

      def filter_by_variant_type(query, params)
        variant_type = params['variant_type'] || []

        return query if variant_type.empty?

        q = query.delete(:query)

        types     = variant_type.map { |x| { term: { variant_type: SequenceOntology.find_by_label(x).id } } }
        condition = [q, { bool: { should: types } }].compact

        query.merge(query: { bool: { must: condition } })
      end

      def filter_by_frequency(query, params)
        freq_source   = params['freq_source'] || []
        freq_relation = params['freq_relation'] || []
        freq_value    = params['freq_value'] || []

        freq = freq_source.zip(freq_relation, freq_value).select { |x| x.last.present? }

        return query if freq.empty?

        q = query.delete(:query)

        sources = freq.map do |x, y, z|
          value = begin
            Float(z)
          rescue
            next nil
          end

          next nil unless %w[jga_ngs jga_snp tommo hgvd exac clinvar].include?(x)
          next nil unless %w[gte gt lte lt].include?(y)

          { range: { "#{x}.frequency" => { y => value } } }
        end.compact

        condition = [q, { bool: { must: sources } }].compact

        query.merge(query: { bool: { must: condition } })
      end

      def filter_by_significance(query, params)
        significance = params['significance'] || []

        return query if significance.empty?

        q = query.delete(:query)

        types = []
        if significance.delete('not_in_clinvar')
          types.push bool: {
            must_not: {
              exists: {
                field: 'clinvar'
              }
            }
          }
        end

        types.push(*significance.map { |x| { term: { 'clinvar.significances': x.tr('_', ' ') } } })
        condition = [q, { bool: { should: types } }].compact

        query.merge(query: { bool: { must: condition } })
      end

      def count_each_category(query = {})
        query = query.merge aggs: {
          total_variant_type: {
            terms: {
              field: 'variant_type'
            }
          },
          total_significance: {
            terms: {
              field: 'clinvar.significances',
              size:  20
            }
          },
          total_jga_ngs:      {
            filter: {
              exists: {
                field: 'jga_ngs'
              }
            }
          },
          total_jga_snp:      {
            filter: {
              exists: {
                field: 'jga_snp'
              }
            }
          },
          total_tommo:        {
            filter: {
              exists: {
                field: 'tommo'
              }
            }
          },
          total_hgvd:         {
            filter: {
              exists: {
                field: 'hgvd'
              }
            }
          },
          total_exac:         {
            filter: {
              exists: {
                field: 'exac'
              }
            }
          },
          total_clinvar:      {
            filter: {
              exists: {
                field: 'clinvar'
              }
            }
          }
        }
        search(query)
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

    # @return [Hash]
    def as_indexed_json(options = {})
      as_json(except: %w[validation_context errors])
    end
  end
end