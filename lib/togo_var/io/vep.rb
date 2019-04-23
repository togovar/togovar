require 'zlib'

module TogoVar
  module IO
    class VEP
      #
      # A VEP::Annotation represents annotations of a line of VEP file
      #
      class Annotation
        def self.parse(str)
          elements = str.split(/\s+/)

          raise(ArgumentError, "wrong number of elements (given #{elements.size}, expected #{HEADERS.size})") unless HEADERS.size == elements.size

          new do |x|
            HEADERS.zip(elements).each do |h, e|
              x.send("#{h}=", e) unless e == '-'
            end
          end
        end

        HEADERS = %w[uploaded_variation location allele gene feature feature_type consequence cdna_position cds_position
                   protein_position amino_acids codons existing_variation impact distance strand flags variant_class symbol
                   symbol_source hgnc_id sift polyphen hgvsc hgvsp hgvs_offset hgvsg clin_sig somatic pheno ref chr_vcf
                   pos_vcf ref_vcf alt_vcf].freeze

        # for indexing
        attr_accessor :uploaded_variation
        attr_accessor :location
        attr_accessor :allele
        attr_accessor :gene
        attr_accessor :feature
        attr_accessor :feature_type
        attr_accessor :consequence
        attr_accessor :cdna_position
        attr_accessor :cds_position
        attr_accessor :protein_position
        attr_accessor :amino_acids
        attr_accessor :codons
        attr_accessor :existing_variation
        attr_accessor :impact
        attr_accessor :distance
        attr_accessor :strand
        attr_accessor :flags
        attr_accessor :variant_class
        attr_accessor :symbol
        attr_accessor :symbol_source
        attr_accessor :hgnc_id
        attr_accessor :sift
        attr_accessor :polyphen
        attr_accessor :hgvsc
        attr_accessor :hgvsp
        attr_accessor :hgvs_offset
        attr_accessor :hgvsg
        attr_accessor :clin_sig
        attr_accessor :somatic
        attr_accessor :pheno
        attr_accessor :ref
        attr_accessor :chr_vcf
        attr_accessor :pos_vcf
        attr_accessor :ref_vcf
        attr_accessor :alt_vcf

        def initialize
          yield self if block_given?
        end
      end

      class << self
        def open(*args)
          f = if args.first.match?(/\.gz$/)
                Zlib::GzipReader.open(*args)
              else
                File.open(*args)
              end
          begin
            vep = new(f)
          rescue Exception
            f.close
            raise
          end

          if block_given?
            begin
              yield vep
            ensure
              vep.close
            end
          else
            vep
          end
        end

        def foreach(path, options = Hash.new, &block)
          return to_enum(__method__, path, options) unless block
          open(path, options) do |vep|
            vep.each(&block)
          end
        end
      end

      DEFAULT_OPTIONS = {
        col_sep: /\s+/
      }.freeze

      attr_reader :lineno

      def initialize(data, options = Hash.new)
        raise ArgumentError, 'Cannot parse nil' if data.nil?

        options = DEFAULT_OPTIONS.merge(options)

        @col_sep = options.delete(:col_sep)

        unless options.empty?
          raise ArgumentError, "Unknown options:  #{options.keys.join(', ')}."
        end

        @io = data.is_a?(String) ? StringIO.new(data) : data
        @lineno = 0
        @memo = nil
      end

      def close
        @io&.close
      end

      def each
        if block_given?
          while (variant = shift)
            yield variant
          end
        else
          to_enum
        end
      end

      def shift
        current = @memo
        variant = Array(@memo)
        @memo = nil

        loop do
          unless (line = @io.gets)
            break variant.empty? ? nil : variant
          end
          @lineno += 1

          parse = VEP::Annotation.parse(line.chomp)

          if current && current.uploaded_variation != parse.uploaded_variation
            @memo = parse
            break variant
          end

          variant << parse

          current = parse
        end
      end
    end
  end
end
