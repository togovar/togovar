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
