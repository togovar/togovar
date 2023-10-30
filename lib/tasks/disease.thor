require_relative '../../config/application'
require 'csv'
require 'thor'
require 'togo_var'

Rails.application.initialize! unless Rails.application.initialized?

module Tasks
  class Disease < Thor
    namespace :disease

    desc 'generate_index', 'Generate disease index'

    def generate_index(output_prefix)
      TogoVar::Ndjson::Writer.open(output_prefix) do |writer|
        fetch_medgen.each do |x|
          writer.write({
                         index: {
                           _index: 'disease',
                           retry_on_conflict: 3
                         }
                       },
                       {
                         id: x[:id].to_s,
                         name: x[:name].to_s,
                         source: x[:source].to_s,
                       })
        end
      end
    end

    desc 'generate_mondo_index', 'Generate disease mondo index'

    def generate_mondo_index(output_prefix)
      TogoVar::Ndjson::Writer.open(output_prefix) do |writer|
        fetch_mondo.each do |x|
          mondo = if (m = x[:mondo].to_s.match(/MONDO_\d+/))
                    m[0]
                  end
          parent = if (m = x[:parent].to_s.match(/MONDO_\d+/))
                    m[0]
                   end

          next unless mondo

          writer.write({
                         index: {
                           _index: 'disease_mondo',
                           retry_on_conflict: 3
                         }
                       },
                       {
                         mondo: mondo,
                         parent: parent,
                         cui: x[:cui].to_s.presence,
                         label: x[:label].to_s.presence,
                       })
        end
      end
    end

    private

    def fetch_medgen
      query <<~SPARQL
        PREFIX dct: <http://purl.org/dc/terms/>
        PREFIX mo: <http://med2rdf/ontology/medgen#>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

        SELECT DISTINCT (?cui AS ?id) (?label AS ?name) ("MedGen" AS ?source)
        WHERE {
          GRAPH <http://togovar.org/medgen> {
            ?medgen a mo:ConceptID ;
              dct:identifier ?cui ;
              rdfs:label ?label .
          }
        }
      SPARQL
    end

    def fetch_mondo
      query <<~SPARQL
        PREFIX dct: <http://purl.org/dc/terms/>
        PREFIX mo: <http://med2rdf/ontology/medgen#>
        PREFIX obo: <http://purl.obolibrary.org/obo/>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

        SELECT DISTINCT ?mondo ?parent ?cui ?label
        WHERE {
          GRAPH <http://togovar.org/mondo> {
            VALUES ?root { obo:MONDO_0000001 }

            ?mondo rdfs:subClassOf+ ?root ;
                   rdfs:subClassOf ?parent ;
                   rdfs:label ?mondo_label .

            FILTER isIRI(?parent)

            GRAPH <http://togovar.org/medgen> {
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
    end

    def query(sparql)
      retry_count = 0

      result = []

      time = Benchmark.realtime do
        result = begin
                   endpoint.query(sparql)
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
  end
end
