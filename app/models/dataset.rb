# frozen_string_literal: true

class Dataset
  Source = Struct.new(:id, :type, :key, :label, :index, keyword_init: true)

  module Sources
    GEM_J_WGA = Source.new(id: :gem_j_wga, type: :frequency, key: 'gem_j_wga', label: 'GEM-J WGA', index: 0)
    JGA_NGS = Source.new(id: :jga_ngs, type: :frequency, key: 'jga_ngs', label: 'JGA-NGS', index: 1)
    JGA_SNP = Source.new(id: :jga_snp, type: :frequency, key: 'jga_snp', label: 'JGA-SNP', index: 2)
    TOMMO = Source.new(id: :tommo, type: :frequency, key: 'tommo', label: 'ToMMo 8.3KJPN', index: 3)
    HGVD = Source.new(id: :hgvd, type: :frequency, key: 'hgvd', label: 'HGVD', index: 4)
    GNOMAD_GENOMES = Source.new(id: :gnomad_genomes, type: :frequency, key: 'gnomad_genomes', label: 'gnomAD Genomes', index: 5)
    GNOMAD_EXOMES = Source.new(id: :gnomad_exomes, type: :frequency, key: 'gnomad_exomes', label: 'gnomAD Exomes', index: 6)
    CLINVAR = Source.new(id: :clinvar, type: :annotation, key: 'clinvar', label: 'ClinVar', index: 7)
    MGEND = Source.new(id: :mgend, type: :annotation, key: 'mgend', label: 'MGeND', index: 8)
  end

  class << self
    # @return [Array<Source>]
    def all
      @all ||= Sources.constants.map { |x| Sources.const_get(x) }.sort_by(&:index)
    end
  end
end
