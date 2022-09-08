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
          end

          def to_hash
            validate

            terms = @sub_concepts ? @terms.map { |x| [x, DiseaseMondo.sub_concepts(x)] }.flatten.uniq : @terms
            terms = terms.map { |x| x.start_with?('MONDO_') ? DiseaseMondo.mondo2cui(x) : x }.flatten.uniq

            q = Elasticsearch::DSL::Search.search do
              query do
                nested do
                  path 'clinvar.conditions'
                  query do
                    terms 'clinvar.conditions.medgen': terms
                  end
                end
              end
            end

            (@relation == 'ne' ? negate(q) : q).to_hash[:query]
          end
        end
      end
    end
  end
end
