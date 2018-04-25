module RootHelper
  def filter_label_for(str)
    case str.downcase
    when 'snv', 'hgvd'
      str.upcase
    when 'togovar'
      'TogoVar'
    when 'tommo'
      '3.5KJPN'
    when 'exac'
      'ExAC'
    when 'clinvar'
      'ClinVar'
    when 'jga_ngs'
      'JGA NGS'
    when 'jga_snp'
      'JGA SNP'
    else
      str.humanize
    end
  end
end
