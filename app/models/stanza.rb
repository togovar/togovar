class Stanza < Settingslogic
  source File.join(Rails.root, 'config', 'stanza.yml')
  namespace Rails.env

  class Base
    class << self

      def method_missing(sym, *args)
        (class << self; self; end).module_eval do
          define_method sym do
            name    = sym.to_s
            label   = args.shift
            options = args.extract_options!

            new(name, label, options)
          end
        end
      end
    end
  end

  class ClinVar < Base
  end

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

    tag = '<togostanza-'
    tag << @name
    if params.present?
      tag << ' '
      tag << params.join(' ')
    end
    tag << ' />'
    tag.html_safe
  end
end
