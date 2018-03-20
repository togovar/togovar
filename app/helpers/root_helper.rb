module RootHelper
  def filter_label_for(str)
    case str.downcase
    when 'snv', 'hgvd'
      str.upcase
    when 'togovar'
      'TogoVar'
    when 'tommo'
      'ToMMo 3.5KJPN'
    when 'exac'
      'ExAC'
    else
      str.humanize
    end
  end
end
