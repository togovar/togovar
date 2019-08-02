require 'active_support'
require 'active_support/core_ext'
require 'json'

require 'togo_var/rdf/vocabulary'

module TogoVar
  module Models
    class Transcript
      include TogoVar::Vocabulary

      # FIXME: wrong ordering of severity because of hashing
      SO_CONSEQUENCE = Hash.new { |hash, key| hash[key] = SequenceOntology.find_by_label(key) }

      class << self
        def most_severe_consequence(*transcripts)
          return if transcripts.blank?

          SO_CONSEQUENCE.each do |_, so|
            t = transcripts.select { |x| x.consequences.present? && x.consequences.include?(so.id) }
            return so.id if t.present?
          end

          nil
        end
      end

      ATTRIBUTES = %i[consequences gene_id transcript_id
                      hgnc_id symbol symbol_source hgvs_c hgvs_p sift polyphen].freeze

      attr_accessor :transcript_id
      attr_accessor :consequences
      attr_accessor :gene_id
      attr_accessor :hgnc_id
      attr_accessor :symbol
      attr_accessor :symbol_source
      attr_accessor :hgvs_c
      attr_accessor :hgvs_p
      attr_accessor :sift
      attr_accessor :polyphen

      def initialize(data = nil)
        if data.is_a?(TogoVar::IO::VEP::Annotation)
          @consequences = data.consequence
                            &.split(',')
                            &.map { |x| SO_CONSEQUENCE[x]&.id }
                            &.compact.presence
          @gene_id = data.gene.presence
          @transcript_id = data.feature.presence
          @hgnc_id = data.hgnc_id.presence&.to_i
          @symbol = data.symbol.presence
          @symbol_source = data.symbol_source.presence
          @hgvs_c = data.hgvsc.presence
          @hgvs_p = (y = data.hgvsp.presence) ? URI.decode(y) : nil
          @sift = data.sift&.match(/\((\d*(\.\d*)?)\)/)&.[](1).presence&.to_f
          @polyphen = data.polyphen&.match(/\((\d*(\.\d*)?)\)/)&.[](1).presence&.to_f
        end

        yield self if block_given?
      end

      def to_h
        ATTRIBUTES.map { |x| [x, send(x)] }.to_h.compact
      end

      def to_triples(parent = RDF::Node.new)
        data = []

        data << [parent, TGVO.has_consequence, (s = RDF::Node.new)]

        Array(consequences).each do |x|
          data << [s, RDF.type, OBO[x]]
        end

        data << [s, RDF::Vocab::RDFS.label, hgvs_c] if hgvs_c.present?
        data << [s, RDF::Vocab::RDFS.label, hgvs_p] if hgvs_p.present?
        data << [s, TGVO.gene, RDF::URI("http://rdf.ebi.ac.uk/resource/ensembl/#{gene_id}")] if gene_id.present?
        data << [s, TGVO.transcript, RDF::URI("http://rdf.ebi.ac.uk/resource/ensembl.transcript/#{transcript_id}")] if transcript_id.presence
        data << [s, TGVO.sift, sift.to_f] if sift.present?
        data << [s, TGVO.polyphen, polyphen.to_f] if polyphen.present?

        data
      end
    end
  end
end
