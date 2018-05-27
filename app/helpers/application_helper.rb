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
    label = name.dup
    klass = 'nav-link'

    if path == active
      label << content_tag(:span, '(current)', class: 'sr-only')
      klass << ' active'

      return content_tag(:span, label.html_safe, class: klass, **options)
    end

    link_to label.html_safe, path, class: klass, **options
  end
end
