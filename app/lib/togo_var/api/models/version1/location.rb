# frozen_string_literal: true

module TogoVar
  module API
    module Models
      module Version1
        class Location < Base
          attr_reader :chromosome
          attr_reader :position

          def initialize(*args)
            super

            arg = @args.first.dup

            @chromosome = arg[:chromosome]
            @position = arg[:position] # Integer or Range
          end

          # @return [Array]
          def models
            return @models if @models

            model = {}
            model.update(chromosome: Chromosome.new(@chromosome))

            @position = case @position
                        when Integer
                          { gte: @position, lte: @position }
                        when Hash
                          @position.with_indifferent_access
                        else
                          raise InvalidQuery, "Invalid value #{@position}:#{@position.class}"
                        end
            model.update(position: Range.new({ field: 'position' }.merge(position))) # just for validation

            @models = [model]
          end

          def to_hash
            validate

            model = self.models.first

            gt_or_gte, from = @position.slice(:gt, :gte).first
            lt_or_lte, to = @position.slice(:lt, :lte).first

            Elasticsearch::DSL::Search.search do
              query do
                bool do
                  must model[:chromosome] if model[:chromosome]
                  if gt_or_gte && lt_or_lte
                    must(&closed_range(gt_or_gte, from, lt_or_lte, to))
                  elsif lt_or_lte
                    must(&left_open_range(lt_or_lte, to))
                  elsif gt_or_gte
                    must(&right_open_range(gt_or_gte, from))
                  end
                end
              end
            end.to_hash[:query]
          end

          private

          def closed_range(gt_or_gte, from, lt_or_lte, to)
            proc do
              bool do
                should do
                  # both start and stop is in range
                  bool do
                    must do
                      range :start do
                        send(gt_or_gte.to_sym, from)
                      end
                    end
                    must do
                      range :stop do
                        send(lt_or_lte.to_sym, to)
                      end
                    end
                  end
                end
                should do
                  # either start or stop is in range
                  bool do
                    should do
                      range :start do
                        send(gt_or_gte.to_sym, from)
                        send(lt_or_lte.to_sym, to)
                      end
                    end
                    should do
                      range :stop do
                        send(gt_or_gte.to_sym, from)
                        send(lt_or_lte.to_sym, to)
                      end
                    end
                  end
                end
                should do
                  # both start and stop is out of range (i.e. overlapping)
                  bool do
                    must do
                      range :start do
                        lte from
                      end
                    end
                    must do
                      range :stop do
                        gte to
                      end
                    end
                  end
                end
              end
            end
          end

          def left_open_range(lt_or_lte, to)
            proc do
              range :start do
                send(lt_or_lte.to_sym, to)
              end
            end
          end

          def right_open_range(gt_or_gte, from)
            proc do
              range :stop do
                send(gt_or_gte.to_sym, from)
              end
            end
          end
        end
      end
    end
  end
end
