# frozen_string_literal: true

module TogoVar
  module API
    module Models
      module Version1
        class Disease < NonStrictTerms
          def initialize(*args)
            super

            arg = @args.first

            @sub_concepts = [true, false].include?(arg[:sub_concepts]) ? arg[:sub_concepts] : true
            @source = Array(arg[:source])
          end

          def to_hash
            validate

            terms = @terms
            sub_concepts = @sub_concepts
            sources = @source # TODO: filter

            q = Elasticsearch::DSL::Search.search do
              query do
                bool do
                  if sources.present?
                    must do
                      terms 'conditions.source': sources
                    end
                  end

                  must do
                    nested do
                      path 'conditions.condition'
                      query do
                        if terms.any? { |x| %w[MONDO_0000001 C0012634].include?(x&.strip) }
                          exists field: 'conditions.condition.medgen'
                        else
                          terms = sub_concepts ? terms.map { |x| [x, DiseaseMondo.sub_concepts(x)] }.flatten.uniq : terms
                          terms = terms.map { |x| x.start_with?('MONDO_') ? DiseaseMondo.mondo2cui(x) : x }.flatten.uniq

                          terms 'conditions.condition.medgen': terms
                        end
                      end
                    end
                  end
                end
              end
            end.to_hash[:query]

            q = if q[:bool][:must].size == 1
                  q[:bool][:must].first
                else
                  q
                end

            query = Elasticsearch::DSL::Search.search do
              query do
                nested do
                  path 'conditions'
                  query q
                end
              end
            end.to_hash[:query]

            @relation == 'ne' ? negate(query) : query
          end
        end
      end
    end
  end
end
