require_relative '../../config/application'
require 'benchmark'
require 'thor'

Rails.application.initialize! unless Rails.application.initialized?

module Tasks
  class DiseaseMondo < Thor
    namespace :disease_mondo

    desc 'import', 'import mondo hierarchy'

    def import
      disable_logging

      ::DiseaseMondo.set_refresh_interval(-1)

      batch_size = 10000
      fetch_data.each_slice(batch_size).with_index do |g, i|
        bulk_request(g.flat_map { |x| bulk_body(x) }, record_number: batch_size * i)
      end
    ensure
      ::DiseaseMondo.set_refresh_interval
    end

    private

    def disable_logging
      return unless defined?(Rails) &&
        Rails.configuration.respond_to?(:elasticsearch) &&
        (config = Rails.configuration.elasticsearch).present?

      ::Elasticsearch::Model.client = ::Elasticsearch::Client.new(config.merge(log: false))
    end

    def fetch_data
      query = <<~SPARQL
        PREFIX dct: <http://purl.org/dc/terms/>
        PREFIX mo: <http://med2rdf/ontology/medgen#>
        PREFIX obo: <http://purl.obolibrary.org/obo/>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

        SELECT DISTINCT ?mondo ?parent ?cui ?label
        WHERE {
          GRAPH <http://togovar.biosciencedbc.jp/mondo> {
            VALUES ?root { obo:MONDO_0000001 }

            ?mondo rdfs:subClassOf+ ?root ;
                   rdfs:subClassOf ?parent ;
                   rdfs:label ?mondo_label .

            FILTER isIRI(?parent)

            GRAPH <http://togovar.biosciencedbc.jp/medgen> {
              OPTIONAL {
                ?mgconso dct:source mo:MONDO ;
                         rdfs:seeAlso ?mondo .

                ?medgen mo:mgconso ?mgconso ;
                        dct:identifier ?cui ;
                        rdfs:label ?medgen_label .
              }
            }

            BIND(IF(bound(?medgen_label), ?medgen_label, ?mondo_label) AS ?label)
          }
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

      warn "query took: #{(time * 1000).to_i}"

      result
    end

    def endpoint
      @endpoint = SPARQL::Client.new(Rails.configuration.endpoint['sparql'])
    end

    def bulk_body(hash)
      [
        {
          index: {
            _index: 'disease_mondo'
          }
        },
        {
          mondo: hash[:mondo].to_s.match(/MONDO_\d+/)&.[](0),
          parent: hash[:parent].to_s.match(/MONDO_\d+/)&.[](0),
          cui: hash[:cui].to_s.presence,
          label: hash[:label].to_s.presence,
        }
      ]
    end

    def bulk_request(data, record_number: nil)
      retry_count = 0

      response = begin
                   ::Elasticsearch::Model.client.bulk(body: data)
                 rescue Faraday::Error => e
                   raise e if (retry_count += 1) > 5
                   warn "#{record_number} - #{e.message} / retry after #{2 ** retry_count} seconds"
                   sleep 2 ** retry_count
                   retry
                 end

      warn "#{record_number} - indexing took: #{response['took']}, errors: #{response['errors'].inspect}"
      if response['errors'] && (items = response['items']).present?
        warn items.find { |x| x.dig('update', 'error') }&.dig('update', 'error')
      end

      response
    end
  end
end
