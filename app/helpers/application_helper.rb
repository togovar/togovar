module ApplicationHelper #:nodoc:
  def title(page_title = '')
    base_title = 'TogoVar'
    if page_title.present?
      page_title + ' | ' + base_title
    else
      base_title
    end
  end

  def nav_link(name, path, active = nil, **options)
    klass = 'item menu-button'
    klass << ' -current' if path == active

    content_tag :li, class: klass do
      if path == active
        content_tag :span, name
      else
        link_to name, path, class: 'link', **options
      end
    end
  end

  def locale_selector(locale, **options)
    klass = 'language menu-button'
    klass << ' -current' if locale == I18n.locale

    content_tag :li, class: klass do
      if locale == I18n.locale
        content_tag :span, locale
      else
        link_to(locale, "#{request.path_info}?locale=#{locale}")
      end
    end
  end

  def link_tag(**options)
    tag :link, options
  end

  def stanza_tag(name, **options)
    tag "togostanza-#{name}", options
  end
end
