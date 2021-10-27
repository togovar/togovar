module Form
  class Dataset < ParameterBase
    register(:jga_ngs, 'JGA-NGS', 'jga_ngs', '1')
    register(:jga_snp, 'JGA-SNP', 'jga_snp', '1')
    register(:hgvd, 'HGVD', 'hgvd', '1')
    register(:tommo, 'ToMMo 8.3KJPN', 'tommo', '1')
    register(:gem_j_wga, 'GEM-J WGA', 'gem_j_wga', '1')
    # register(:exac, 'ExAC', 'exac', '1')
    register(:gnomad_exomes, 'gnomAD Exomes', 'gnomad_exomes', '1')
    register(:gnomad_genomes, 'gnomAD Genomes', 'gnomad_genomes', '1')
    # register(:mgend, 'MGeND', 'mgend', '0')
    register(:clinvar, 'ClinVar', 'clinvar', '1')
  end
end
