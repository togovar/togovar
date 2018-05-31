require 'benchmark'
require 'rdf'

class Obo < RDF::Vocabulary('http://purl.obolibrary.org/obo/');
end

# Wrapper class for accessing so.owl
class SequenceOntology < RDF::Vocabulary('http://purl.obolibrary.org/obo/')
  class << self
    FILE_PATH = File.join(Rails.root, 'res', 'so.owl')
    ID_FORMAT = /SO_\d{7}/

    def find(id)
      unless id.match?(ID_FORMAT)
        msg = "Expected is #{ID_FORMAT.inspect}, but given is #{id}"
        raise ArgumentError(msg)
      end

      cache.fetch(id) do |k|
        result = solution(k).first
        break nil unless result
        v = new do |r|
          r.id           = k
          r.label        = result.label.to_s
          r.definition   = result.definition.to_s
          r.sub_class_of = result.sub_class_of.to_s
        end
        cache.store(k, v)
      end
    end

    def find_by_label(label)
      return nil if label.blank?

      r = cache.find { |_, v| v.label.downcase == label }
      return r[1] if r

      id = id_for_label(label)
      raise("No definitions found for #{label}") unless id

      find(id)
    end

    private

    def cache
      @cache ||= {}
    end

    def log(msg, level = :info)
      return unless Rails.logger
      Rails.logger.send(level, msg) if Rails.logger.respond_to?(level)
    end

    def repository
      @repo ||= SPARQL::Client.new(Endpoint.url)
    end

    def solution(id)
      log("Obtaining solutions for #{id}")
      subject    = self[id]
      definition = self['IAO_0000115']

      repository
        .select
        .graph('http://togovar.org/graph/so')
        .optional([subject, RDF::Vocab::RDFS.label, :label])
        .optional([subject, definition, :definition])
        .optional([subject, RDF::Vocab::RDFS.subClassOf, :sub_class_of])
        .execute
    end

    def id_for_label(label)
      log("Obtaining ID for #{label}")

      r = repository
            .select
            .graph('http://togovar.org/graph/so')
            .where([:subject, RDF::Vocab::RDFS.label, :label])
            .execute
            .first

      r ? r.subject.to_s.split('/').last : nil
    end
  end

  attr_accessor :id
  attr_accessor :label
  attr_accessor :definition
  attr_accessor :sub_class_of

  def initialize(*args)
    @id           = args.shift
    @label        = args.shift
    @definition   = args.shift
    @sub_class_of = args.shift

    yield self if block_given?
  end
end
