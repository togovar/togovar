require 'benchmark'
require 'rdf'

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

      r = cache.find { |_, v| v.label == label }
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
      @repo ||= begin
        log("Loading #{FILE_PATH}")
        g    = nil
        time = Benchmark.realtime { g = RDF::Graph.load(FILE_PATH) }
        log("Completed in #{(time * 1000).round(1)}ms")
        g
      end
    end

    def solution(id)
      log("Obtaining solutions for #{id}")
      s          = self[id]
      definition = self['IAO_0000115']

      query = RDF::Query.new do
        pattern [s, RDF::Vocab::RDFS.label, :label], optional: true
        pattern [s, definition, :definition], optional: true
        pattern [s, RDF::Vocab::RDFS.subClassOf, :sub_class_of], optional: true
      end
      query.execute(repository)
    end

    def id_for_label(label)
      log("Obtaining ID for #{label}")
      query = RDF::Query.new do
        pattern [:s, RDF::Vocab::RDFS.label, label]
      end

      r = query.execute(repository).first
      r ? r.s.to_s.split('/').last : nil
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