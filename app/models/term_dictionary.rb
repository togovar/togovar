# frozen_string_literal: true

class TermDictionary
  # @param [String] id
  # @param [Symbol] key
  # @param [String] label
  Term = Struct.new(:id, :key, :label) do
    def to_s
      key.to_s
    end
  end

  class << self
    def find(id)
      find_by(:id, id)
    end

    def find_by_key(key)
      find_by(:key, key)
    end

    def find_by_label(label)
      find_by(:label, label)
    end

    private

    def terms
      @terms ||= constants
                   .map { |x| const_get(x) }
                   .select { |x| x.is_a?(TermDictionary::Term) }
    end

    def find_by(field, value)
      terms.each do |term|
        return term if (v = term.send(field)) == normalize_type(v, value)
      end

      nil
    end

    def normalize_type(ref, obj)
      case ref
      when Symbol
        obj.to_sym
      when String
        obj.to_s
      else
        obj
      end
    end
  end
end
