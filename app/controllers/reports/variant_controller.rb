module Reports
  class VariantController < ApplicationController
    def show(id)
      id.sub!('tgv', '') # TODO: remove when RDF updated
      @tgv_id = id

      @stanza = []

      @stanza << Stanza.row_headered_table(nil,
                                           nav_id:    'variant_information',
                                           nav_label: 'Variant Information',
                                           args:      { url: "https://togovar.org/sparqlist/api/variant_basic_information?tgv_id=#{id}" })
      @stanza << Stanza.variant_frequency('Frequency', args: { tgv_id: id })
      @stanza << Stanza.variant_jbrowse('Genomic context', args: { tgv_id: id })
      @stanza << Stanza.column_headered_table('Transcripts', args: { url: "https://togovar.org/sparqlist/api/variant_transcripts?tgv_id=#{id}" })

      lookup = Lookup.find(id)

      if (allele_id = lookup&.clinvar&.allele_id)
        variation_id = Reports::Variant.variation_id_for_allele(allele_id)
        @stanza << Stanza.clinvar_variant_information('Variant Information', args: { clinvar_id: variation_id })
        @stanza << Stanza.clinvar_variant_interpretation('Variant Interpretation', args: { clinvar_id: variation_id })
        @stanza << Stanza.clinvar_variant_alleles('Variant Alleles', args: { clinvar_id: variation_id })
      end

      if (rs = lookup&.rs)
        Array(rs).each do |x|
          @stanza << Stanza.variant_publications("Publications (#{x})",
                                                 nav_id:    "publication_#{x}",
                                                 nav_label: 'Publications',
                                                 args:      { url: "https://togovar.org/sparqlist/api/rs2disease?rs=#{x}" })
        end
      end
    end
  end
end
