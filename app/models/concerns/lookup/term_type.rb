class Lookup
  module TermType
    extend ActiveSupport::Concern

    DISEASE = Struct.new(:term) do
      def where
        { 'clinvar_info.conditions': { '$in': [term] } }
      end
    end

    SYMBOL = Struct.new(:term) do
      def where
        { 'molecular_annotation.symbol': /^#{term}$/i }
      end
    end

    RS = Struct.new(:term) do
      def where
        { 'base.existing_variation': /#{term}(,.*)?$/ }
      end
    end

    TGV = Struct.new(:term) do
      def where
        { tgv_id: term }
      end
    end

    # @param [String] chr Chromosome
    # @param [Int] position Position
    POSITION = Struct.new(:chr, :position) do
      def where
        { 'base.chromosome': chr, 'base.position': position }
      end
    end

    # @param [String] chr Chromosome
    # @param [Int] start Start
    # @param [Int] stop Stop
    REGION = Struct.new(:chr, :start, :stop) do
      def where
        { 'base.chromosome': chr, 'base.position': { '$gte': start, '$lte': stop } }
      end
    end

    HGVS = Struct.new(:term) do
      def where
        # TODO: implement
        nil
      end
    end

    module ClassMethods
      def term_type(str)
        return nil if str.blank?
        case str
          when /^tgv(\d+)$/i
            TGV.new(Regexp.last_match(1).to_i)
          when /^rs\d+$/i
            RS.new(str.downcase)
          when /^(\d+|[XY]):(\d+)$/
            m = Regexp.last_match
            POSITION.new(m[1].to_s, m[2].to_i)
          when /^(\d+|[XY]):(\d+)-(\d+)$/
            m = Regexp.last_match
            REGION.new(m[1].to_s, m[2].to_i, m[3].to_i)
          else
            if Lookup.where(SYMBOL.new(str).where).count.positive?
              SYMBOL.new(str)
            else
              DISEASE.new(str)
            end
        end
      end
    end
  end
end
