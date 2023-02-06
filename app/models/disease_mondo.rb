class DiseaseMondo
  include DiseaseMondo::Searchable
  include Queryable

  class << self
    # @param [String] node CUI or Mondo
    def sub_concepts(node)
      mondo = node.start_with?('MONDO_')

      result = query(<<-SPARQL)
        PREFIX dct: <http://purl.org/dc/terms/>
        PREFIX mo: <http://med2rdf/ontology/medgen#>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

        SELECT DISTINCT ?cui
        WHERE {
          {
            SELECT ?descendants
            WHERE {
              #{mondo ? %[VALUES ?mondo { <http://purl.obolibrary.org/obo/#{node}> }] : %[VALUES ?cui { "#{node}" }] }

              #{'GRAPH <http://togovar.biosciencedbc.jp/medgen> {
                  ?medgen dct:identifier ?cui ;
                          mo:mgconso ?mgconso .
                  ?mgconso dct:source mo:MONDO ;
                           rdfs:seeAlso ?mondo .
                }' unless mondo}

              GRAPH <http://togovar.biosciencedbc.jp/mondo> {
                ?descendants rdfs:subClassOf+ ?mondo .
              }
            }
          }

          GRAPH <http://togovar.biosciencedbc.jp/medgen> {
            ?mgconso dct:source mo:MONDO ;
                     rdfs:seeAlso ?descendants .
            ?medgen dct:identifier ?cui ;
                    mo:mgconso ?mgconso .
          }
        }
      SPARQL

      result.map { |x| x[:cui] }
    end

    def mondo2cui(mondo)
      query = {
        query: {
          match: {
            mondo: mondo
          }
        }
      }

      __elasticsearch__.search(query)
                       .results
                       .map { |x| x.dig('_source', 'cui') }
                       .reject(&:blank?)
                       .uniq
    end
  end
end
