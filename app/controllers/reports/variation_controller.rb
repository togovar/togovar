module Reports
  class VariationController < ApplicationController
    def show
      tgv_id = params.permit(:tgv_id)[:tgv_id]

      @stanza = []

      url = "http://togovar.l5dev.jp/sparqlist/api/variant_basic_information?tgv_id=#{tgv_id}"
      @stanza << Stanza::ClinVar.row_headered_table("ID: tgv#{tgv_id}", url: url)

      lookup = Lookup.find(tgv_id)

      if (allele_id = lookup&.clinvar&.allele_id)
        variation_id = Reports::Variation.variation_id_for_allele(allele_id)
        @stanza << Stanza::ClinVar.clinvar_variant_information('Variant Information', clinvar_id: variation_id)
        @stanza << Stanza.genome_jbrowse('Variant Information', gene_id: 'ADH1A', tax_id: '9606')
        @stanza << Stanza::ClinVar.clinvar_variant_interpretation('Variant Interpretation', clinvar_id: variation_id)
        @stanza << Stanza::ClinVar.clinvar_variant_alleles('Variant Alleles', clinvar_id: variation_id)
      end

      if (rs = lookup&.rs)
        Array(rs).each do |x|
          @stanza << Stanza::ClinVar.pubtator_stanza('Publications', rs: x)
        end
      end
    end
  end
end
