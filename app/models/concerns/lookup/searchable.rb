class Lookup
  module Searchable
    extend ActiveSupport::Concern

    included do
      include Elasticsearch::Model
      # include Elasticsearch::Model::Callbacks

      index_name :variant
    end

    include TermType

    module ClassMethods
      def list(params)
        term = term_type((params['term'] || '').strip)

        if [params['source'], params['variant_type'], params['significance']].any?(&:blank?)
          query = { size: 0 }
        else
          start = (params['start'] || 0).to_i
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

        query = enable_scope(query)
        query = enable_count(query)

        Rails.logger.info('query term: ' + term.inspect)
        Rails.logger.info('es query: ' + query.to_json)

        result = search(query)

        hits_total = result['hits']['total']
        sources = result['hits']['hits'].map { |x| x['_source'] }

        total_variant_type = result['aggregations']['total_variant_type']['buckets'].map do |t|
          [SequenceOntology.find(t['key']).label.downcase, t['doc_count']]
        end.to_h

        total_significance = result.dig('aggregations', 'total_significance', 'by_interpretation', 'buckets').map do |t|
          [t['key'], t['doc_count']]
        end.to_h
        total_significance['not in clinvar'] = result['aggregations']['total_not_in_clinvar']['doc_count']

        total_dataset = %w[jga_ngs jga_snp tommo hgvd exac clinvar].map do |d|
          [d, result['aggregations']["total_#{d}"]['doc_count']]
        end.to_h

        # FIXME: insert SO label into base.variant_class
        replace = sources.map do |r|
          json = r.as_json
          if (var_class = json['variant_type'])
            json['variant_type'] = SequenceOntology.find(var_class).label
          end
          if (consequence = json['most_severe_consequence'])
            json['most_severe_consequence'] = SequenceOntology.find(consequence).label
          end
          json
        end

        warning_message = if sources.present? && hits_total > 1_000_000
                            'Scroll function over 1,000,000 results is currently unavailable.'
                          end

        filtered_count = if sources.blank?
                           0
                         else
                           hits_total <= 1_000_000 ? hits_total : 1_000_000
                         end

        time = if (took = result['took'])
                 format('%.1f[s]', (took.to_f / 1000.0))
               end

        { recordsTotal: search(enable_scope(size: 0))['hits']['total'],
          recordsFiltered: filtered_count,
          condition: term&.display_condition,
          took: time,
          data: replace,
          total_variant_type: total_variant_type,
          total_significance: total_significance,
          total_dataset: total_dataset,
          warning: warning_message }
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

        sources = source.map { |x| { exists: { field: x } } }
        condition = [q, { bool: { should: sources } }].compact

        query.merge(query: { bool: { must: condition } })
      end

      def filter_by_variant_type(query, params)
        variant_type = params['variant_type'] || []

        return query if variant_type.empty?

        q = query.delete(:query)

        types = variant_type.map { |x| { term: { variant_type: SequenceOntology.find_by_label(x).id } } }
        condition = [q, { bool: { should: types } }].compact

        query.merge(query: { bool: { must: condition } })
      end

      def filter_by_frequency(query, params)
        freq_source = params['freq_source'] || []
        freq_relation = params['freq_relation'] || []
        freq_value = params['freq_value'] || []

        freq = freq_source.zip(freq_relation, freq_value).select { |x| x.last.present? }

        return query if freq.empty?

        q = query.delete(:query)

        sources = freq.map do |x, y, z|
          value = begin
            Float(z)
          rescue ArgumentError
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
              nested: {
                path: 'condition',
                query: {
                  exists: {
                    field: 'condition'
                  }
                }
              }
            }
          }
        end

        types.push(*significance.map { |x| { term: { 'clinvar.significances': x.tr('_', ' ') } } })
        condition = [q, { bool: { should: types } }].compact

        query.merge(query: { bool: { must: condition } })
      end

      def enable_scope(query = {})
        condition = {
          bool: {
            should: [
              {
                nested: {
                  path: 'frequency',
                  query: {
                    exists: {
                      field: 'frequency'
                    }
                  }
                }
              },
              {
                nested: {
                  path: 'condition',
                  query: {
                    exists: {
                      field: 'condition'
                    }
                  }
                }
              }
            ]
          }
        }

        if (q = query.delete(:query))
          query.merge(query: { bool: { must: [q, condition] } })
        else
          query.merge(query: condition)
        end
      end

      def enable_count(query = {})
        query.merge aggs: {
          total_variant_type: {
            terms: {
              field: 'variant_type'
            }
          },
          total_significance: {
            nested: {
              path: 'condition'
            },
            aggs: {
              by_interpretation: {
                terms: {
                  field: 'condition.interpretation',
                  size: 20
                }
              }
            }
          },
          total_clinvar: {
            filter: {
              nested: {
                path: 'condition',
                query: {
                  exists: {
                    field: 'condition'
                  }
                }
              }
            }
          },
          total_not_in_clinvar: {
            filter: {
              bool: {
                must_not: {
                  nested: {
                    path: 'condition',
                    query: {
                      exists: {
                        field: 'condition'
                      }
                    }
                  }
                }
              }
            }
          },
          total_jga_ngs: {
            filter: {
              nested: {
                path: 'frequency',
                query: {
                  match: {
                    'frequency.source': 'JGA-NGS'
                  }
                }
              }
            }
          },
          total_jga_snp: {
            filter: {
              nested: {
                path: 'frequency',
                query: {
                  match: {
                    'frequency.source': 'JGA-SNP'
                  }
                }
              }
            }
          },
          total_tommo: {
            filter: {
              nested: {
                path: 'frequency',
                query: {
                  match: {
                    'frequency.source': 'ToMMo'
                  }
                }
              }
            }
          },
          total_hgvd: {
            filter: {
              nested: {
                path: 'frequency',
                query: {
                  match: {
                    'frequency.source': 'HGVD'
                  }
                }
              }
            }
          },
          total_exac: {
            filter: {
              nested: {
                path: 'frequency',
                query: {
                  match: {
                    'frequency.source': 'ExAC'
                  }
                }
              }
            }
          }
        }
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

        request = { index: index_name,
                    type: document_type,
                    body: records.map { |_, v| { index: { data: v } } },
                    refresh: true }
        response = client.bulk(request)
        errors += response['items'].select { |k, _| k.values.first['error'] }

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
