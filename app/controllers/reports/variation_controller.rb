module Reports
  class VariationController < ApplicationController
    def show(id)
      @tgv_id = id

      @stanza = []

      @stanza << Stanza.row_headered_table('', url: "https://togovar.org/sparqlist/api/variant_basic_information?tgv_id=#{id}")
      @stanza << Stanza.variant_frequency('Frequency', tgv_id: id)
      @stanza << Stanza.variant_jbrowse('Genomic context', tgv_id: id)
      @stanza << Stanza.column_headered_table('Transcripts', url: "https://togovar.org/sparqlist/api/variant_transcripts?tgv_id=#{id}")

      lookup = Lookup.find(id)

      if (allele_id = lookup&.clinvar&.allele_id)
        variation_id = Reports::Variation.variation_id_for_allele(allele_id)
        @stanza << Stanza.clinvar_variant_information('Variant Information', clinvar_id: variation_id)
        @stanza << Stanza.clinvar_variant_interpretation('Variant Interpretation', clinvar_id: variation_id)
        @stanza << Stanza.clinvar_variant_alleles('Variant Alleles', clinvar_id: variation_id)
      end

      if (rs = lookup&.rs)
        Array(rs).each do |x|
          @stanza << Stanza.column_headered_table('Publications', url: "https://togovar.org/sparqlist/api/rs2disease?rs=#{x}")
        end
      end
    end
  end
end
