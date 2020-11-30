# frozen_string_literal: true

module TogoVar
  module API
    module Models
      module Version1
        class StrictTerms < NonStrictTerms
          class << self
            def inherited(subclass)
              super

              subclass.validate lambda {
                @terms.each do |term|
                  next if acceptable_terms.include? term

                  list = acceptable_terms.to_sentence(CommonOptions::SENTENCE_OR_CONNECTORS)
                  errors.add(:terms, "must consist of '#{list}'")
                  break
                end
              }
            end
          end

          protected

          # All subclass must implement this method
          #
          # @return [Array]
          def acceptable_terms
            raise NotImplementedError
          end
        end
      end
    end
  end
end
