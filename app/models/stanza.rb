class Stanza
  def self.method_missing(sym, *args)
    new(sym.to_s, args.shift, args.extract_options!)
  end

  include ActionView::Helpers::TagHelper

  attr_reader :name

  # the title shown above the stanza
  attr_reader :title

  # for navigation menu
  attr_reader :nav_id
  attr_reader :nav_label

  def initialize(name, title, **options)
    @name      = name
    @title     = title || ''
    @nav_id    = options.delete(:nav_id) || @title.underscore
    @nav_label = options.delete(:nav_label) || @title
    @options   = options
  end

  def link
    "<link rel='import' href='/stanza/#{@name}/' />".html_safe
  end

  def tag
    args   = @options[:args] || {}
    params = args.map { |k, v| %(#{k}="#{v.to_s.gsub('"', '&quot;')}") }

    tag = "<togostanza-#{@name}"
    if params.present?
      tag << ' '
      tag << params.join(' ')
    end
    tag << "></togostanza-#{@name}>"

    tag.html_safe
  end
end
