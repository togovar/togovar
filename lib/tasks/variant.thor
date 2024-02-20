require_relative '../../config/application'
require 'benchmark'
require 'thor'
require 'togo_var'
require 'digest/sha2'

Rails.application.initialize! unless Rails.application.initialized?

module Tasks
  class Variant < Thor
    namespace :variant

    desc 'generate_clinvar_annotation', 'ClinVar annotations collected by SPARQL'

    def generate_clinvar_annotation(output_prefix)
      disable_logging

      TogoVar::Ndjson::Writer.open(output_prefix) do |writer|
        batch_size = 500
        total = 0
        search_after = nil

        (0..(total_count / batch_size.to_f).to_i).each do
          indices = fetch_indices(size: batch_size, search_after: search_after, record_number: total)
                      .results
                      .map { |r| r.slice(:_id, :_source) }
                      .map { |r| [r.dig(:_source, :clinvar, :id), r] }
                      .to_h

          total += indices.size
          search_after = indices.keys.sort.last

          results = fetch_annotations(*indices.keys, record_number: total)
                      .map { |r| r.to_h.slice(:variation_id, :interpretation, :medgen).transform_values(&:object) }
                      .group_by { |r| r[:variation_id] }

          merged = indices.map { |k, v| v.merge(annotation: results[k] || []) }

          merged.each do |x|
            writer.write({
                           update: {
                             _index: 'variant',
                             _id: x[:_id],
                             retry_on_conflict: 3
                           }
                         },
                         {
                           doc: {
                             clinvar: {
                               conditions: x[:annotation].map do |r|
                                 {
                                   medgen: r[:medgen],
                                   interpretation: r[:interpretation]&.split(/[,;\/]\s*/)&.map(&:downcase),
                                 }
                               end
                             }
                           }
                         })
          end
        end
      end
    end

    private

    def disable_logging
      return unless defined?(Rails) &&
        Rails.configuration.respond_to?(:elasticsearch) &&
        (config = Rails.configuration.elasticsearch).present?

      ::Elasticsearch::Model.client = ::Elasticsearch::Client.new(config.merge(log: false))
    end

    def total_count
      query = ::Elasticsearch::DSL::Search.search do
        query do
          exists field: 'clinvar.id'
        end
      end

      retry_count = 0

      begin
        ::Variation.count(body: query.to_hash)
      rescue StandardError => e
        raise e if (retry_count += 1) > 5
        warn "#{e.message} / Retry after #{2 ** retry_count} seconds"
        sleep 2 ** retry_count
        retry
      end
    end

    def fetch_indices(size: 500, search_after: nil, record_number: nil)
      query = ::Elasticsearch::DSL::Search.search do
        query do
          exists field: 'clinvar.id'
        end
        sort do
          by 'clinvar.id', order: 'asc'
        end
        _source includes: ['clinvar.id']
        size size
      end

      if search_after
        query = query.to_hash.merge(search_after: [search_after])
      end

      retry_count = 0

      response = begin
                   ::Variation.search(query.to_hash)
                 rescue StandardError => e
                   raise e if (retry_count += 1) > 5
                   warn "#{e.message} / Retry after #{2 ** retry_count} seconds"
                   sleep 2 ** retry_count
                   retry
                 end

      warn "#{record_number + response.size} - search took: #{response.took}"

      response
    end

    def fetch_annotations(*variation_id, record_number: nil)
      query = <<~SPARQL
        DEFINE sql:select-option "order"

        PREFIX dct: <http://purl.org/dc/terms/>
        PREFIX cvo: <http://purl.jp/bio/10/clinvar/>
        PREFIX clinvar_variation: <http://ncbi.nlm.nih.gov/clinvar/variation/>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

        SELECT DISTINCT ?variation_id ?interpretation ?medgen
        FROM <http://togovar.org/clinvar>
        WHERE {
          VALUES ?variation { #{variation_id.map { |x| "clinvar_variation:#{x}" }.join(' ')} }

          ?variation a cvo:VariationArchiveType ;
            cvo:variation_id ?variation_id ;
            cvo:interpreted_record/cvo:rcv_list/cvo:rcv_accession ?_rcv .

          ?_rcv cvo:interpretation ?interpretation ;
            cvo:interpreted_condition_list/cvo:interpreted_condition ?_interpreted_condition .

          ?_interpreted_condition dct:source ?db ;
            dct:identifier ?medgen .

          FILTER( ?db IN ("MedGen") )
        }
      SPARQL

      retry_count = 0

      result = []

      time = Benchmark.realtime do
        result = begin
                   endpoint.query(query)
                 rescue StandardError => e
                   raise e if (retry_count += 1) > 5
                   warn "#{e.message} / Retry after #{2 ** retry_count} seconds"
                   sleep 2 ** retry_count
                   retry
                 end
      end

      warn "#{record_number} - query took: #{(time * 1000).to_i}"

      result
    end

    def endpoint
      @endpoint ||= SPARQL::Client.new(Rails.configuration.endpoint['sparql'])
    end
  end
end
