module ApplicationHelper #:nodoc:
  def title(page_title = '')
    base_title = 'TogoVar'
    if page_title.present?
      page_title + ' | ' + base_title
    else
      base_title
    end
  end
end

if defined?(ActionView)
  module ActionView
    module Helpers #:nodoc:
      module AssetTagHelper #:nodoc:
        # stanza_link_tag('some_stanza')
        # # => <link rel="import" href="http://<stanza_server>/some_stanza/">
        def stanza_link_tag(*sources)
          options = sources.extract_options!.stringify_keys
          sources.uniq.map do |source|
            source = unless source =~ %r{^https?:\/\/}
                       "#{Stanza.server.url}/#{source}/"
                     end

            tag_options = options.merge!(rel:  'import',
                                         href: URI.parse(source).to_s)
            tag(:link, tag_options)
          end.join("\n").html_safe
        end
      end
    end
  end
end
