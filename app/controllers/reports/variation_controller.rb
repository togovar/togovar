module Reports
  class VariationController < ApplicationController
    def show
      allele_id    = params.permit(:allele_id)[:allele_id]
      variation_id = Reports::Variation.variation_id_for_allele(allele_id)

      @param = { clinvar_allele_id: allele_id,
                 clinvar_variation_id: variation_id }

      @stanza = [
        Stanza::ClinVar.clinvar_variant_information('Variant Information', variation_id: variation_id),
        Stanza::ClinVar.clinvar_variant_interpretation('Variant Interpretation', variation_id: variation_id),
        Stanza::ClinVar.clinvar_variant_alleles('Variant Alleles', variation_id: variation_id)
      ]
    end
  end
end
