module TogoVar
  module RDF
    module Formatter
      module VEP
        include Vocabulary

        SUBJECT_FORMAT = VARIATION_SUBJECT_FORMAT

        def to_rdf
          statements = RDF::Statements.new

          s = ::RDF::URI.new(SUBJECT_FORMAT % [chrom, pos, ref, alt.first])

          consequences = Array(info['CSQ']).map { |x| CONSEQUENCE_KEYS.zip(x.split('|')).to_h }
          variant_class = consequences.map { |x| x['VARIANT_CLASS'] }.uniq

          raise "Failed to obtain variant class" if variant_class.size.zero?
          raise "Variant class conflicts: #{variant_class}" unless variant_class.size == 1

          statements << [s, ::RDF.type, OBO[SO_VARIANT_TYPE[variant_class.first].id]]

          statements << [s, ::RDF::Vocab::DC.identifier, id] unless id == '.'

          label = [chrom, pos, ref, alt].join('-')
          statements << [s, ::RDF::Vocab::RDFS.label, label]

          location = TogoVar::Util::Variation.vcf_to_faldo_location(chrom, pos, ref, alt.first)
          if (bn = location.dig(0, 0))
            statements << [s, FALDO.location, bn]
            statements.concat(location)
          end

          _, _, ref, alt = to_refsnp_location
          statements << [s, M2R['reference_allele'], ref || '']
          statements << [s, M2R['alternative_allele'], alt || '']

          statements << [s, M2R['referece_allele_vcf'], ref]
          statements << [s, M2R['alternative_allele_vcf'], alt]

          consequences.flat_map { |x| x['Existing_variation'].split('&') }
            .reject(&:blank?)
            .compact
            .uniq
            .filter { |x| x.match?(/^rs\d+$/) }
            .each do |x|
            statements << [s, ::RDF::Vocab::RDFS.seeAlso, ::RDF::URI.new("http://identifiers.org/dbsnp/#{x}")]
          end

          consequences.each do |csq|
            statements << [s, TGV.hasConsequence, (bn = ::RDF::Node.new)]

            if (id = csq['Feature']).present?
              statements << [bn, TGV.transcript, ::RDF::URI("http://rdf.ebi.ac.uk/resource/ensembl.transcript/#{id}")]
            end

            Array(csq['Consequence'].presence&.split('&')).each do |x|
              statements << [bn, ::RDF.type, OBO[TogoVar::SO_CONSEQUENCE[x].id]]
            end

            [csq['HGVSc'], csq['HGVSp'], csq['HGVSg']].map(&:presence).compact.each do |x|
              statements << [bn, ::RDF::Vocab::RDFS.label, x]
            end
            if (id = csq['Gene']).present?
              statements << [bn, TGV.gene, ::RDF::URI("http://rdf.ebi.ac.uk/resource/ensembl/#{id}")]
            end
            if (id = csq['HGNC_ID']).present?
              statements << [bn, TGV.gene, ::RDF::URI("http://rdf.ebi.ac.uk/resource/ensembl/#{id}")]
            end

            if (m = REGEX::REAL_NUMBER.match(csq['SIFT'])).present?
              statements << [bn, TGV.sift, Float(m[0])]
            end
            if (m = REGEX::REAL_NUMBER.match(csq['PolyPhen'])).present?
              statements << [bn, TGV.polyphen, Float(m[0])]
            end
          end

          statements
        end
      end
    end
  end
end
