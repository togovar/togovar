module Form
  class Dataset < ParameterBase
    register(:jga_ngs, 'JGA-NGS', 'jga_ngs', '1')
    register(:jga_snp, 'JGA-SNP', 'jga_snp', '1')
    register(:tommo, 'ToMMo', 'tommo', '1')
    register(:exac, 'ExAC', 'exac', '1')
    # register(:gnomad, 'gnomAD', 'gnomad', '0')
    # register(:mgend, 'MGeND', 'mgend', '0')
    register(:clinvar, 'ClinVar', 'clinvar', '1')
  end
end
