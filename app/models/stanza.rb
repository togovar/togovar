class Stanza < Settingslogic
  source File.join(Rails.root, 'config', 'stanza.yml')
  namespace Rails.env

  class Base
    def self.inherited(_child)
      class << self
        def method_missing(sym, *args)
          new(sym.to_s, args.shift, args.extract_options!)
        end
      end
    end

    include ActionView::Helpers::TagHelper

    attr_reader :name
    attr_reader :label

    def initialize(name, label, **options)
      @name    = name
      @label   = label
      @options = options
    end

    def link
      tag = %(<link rel='import' href='http://#{Stanza.host}/stanza/)
      tag << @name
      tag << %(/' />)
      tag.html_safe
    end

    def tag
      params = @options.map { |k, v| %(#{k}="#{v.to_s.gsub('"', '&quot;')}") }

      tag = "<togostanza-#{@name}"
      if params.present?
        tag << ' '
        tag << params.join(' ')
      end
      tag << ' />'

      tag.html_safe
    end
  end

  class ClinVar < Base;
  end
end
