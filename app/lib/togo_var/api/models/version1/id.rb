# frozen_string_literal: true

module TogoVar
  module API
    module Models
      module Version1
        class Id < Base
          attr_reader :id

          validates :id, presence: true

          def initialize(*args)
            super

            @id = @args.first
          end

          def to_hash
            validate

            tgv = if tgv_id.present?
                    proc do
                      terms id: tgv_id
                    end
                  end

            rs = if rs_id.present?
                   proc do
                     nested do
                       path :xref
                       query do
                         bool do
                           must do
                             match 'xref.source': 'dbSNP'
                           end
                           must do
                             terms 'xref.id': rs_id
                           end
                         end
                       end
                     end
                   end
                 end

            if tgv.blank?
              Elasticsearch::DSL::Search.search do
                query(&rs)
              end
            elsif rs.blank?
              Elasticsearch::DSL::Search.search do
                query(&tgv)
              end
            else
              Elasticsearch::DSL::Search.search do
                query do
                  bool do
                    should(&tgv)
                    should(&rs)
                  end
                end
              end
            end.to_hash[:query]
          end

          private

          def tgv_id
            id.filter { |x| x.start_with? 'tgv' }
              .map { |x| x.delete_prefix('tgv') }
              .map { |x| Integer(x, exception: false) }
              .compact
          end

          def rs_id
            id.filter { |x| x.start_with? 'rs' }
          end
        end
      end
    end
  end
end
