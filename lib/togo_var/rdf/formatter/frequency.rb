module TogoVar
  module RDF
    module Formatter
      module Frequency
        include Vocabulary

        SUBJECT_FORMAT = VARIATION_SUBJECT_FORMAT

        def to_rdf
          statements = RDF::Statements.new

          s = ::RDF::URI.new(SUBJECT_FORMAT % [chrom, pos, ref, alt.first])

          statements << [s, TGV.statistics, (bn = ::RDF::Node.new)]
          statements << [bn, ::RDF.type, TGV.Statistics]
          statements << [bn, ::RDF::Vocab::DC.source, source_label(source)]

          statements << [bn, TGV.quality, qual]

          filter.split(';').each do |x|
            next if x.blank? || x == '.'

            statements << [bn, TGV.filter, x.match?(/^pass$/i) ? 'PASS' : x]
          end

          statements << [bn, TGV.alleleCount, Integer(info['AC'] || info['AC_Adj'] || 0)]
          statements << [bn, TGV.alleleNumber, Integer(info['AN'] || info['AN_Adj'] || 0)]
          statements << [bn, TGV.alleleFrequency, Float(info['AF'] || info['AF_Adj'] || 0)]

          if (v = info['AAC']).present?
            statements << [bn, TGV.homozygousAlternativeAlleleCount, Integer(v)]
          end
          if (v = info['ARC']).present?
            statements << [bn, TGV.heterozygousAlleleCount, Integer(v)]
          end
          if (v = info['RRC']).present?
            statements << [bn, TGV.homozygousReferenceAlleleCount, Integer(v)]
          end

          %w[AFR AMR EAS FIN NFE SAS OTH].each do |key|
            ac = info["AC_#{key}"].presence
            an = info["AN_#{key}"].presence
            af = info["AF_#{key}"].presence

            next unless ac || an || af

            statements << [bn, SIO['SIO_000028'], (p = ::RDF::Node.new)] # has_part
            statements << [p, ::RDF::Vocab::RDFS.label, source_label(key)]
            statements << [p, TGV.alleleCount, Integer(ac)] if ac.present?
            statements << [p, TGV.alleleNumber, Integer(an)] if an.present?
            statements << [p, TGV.alleleFrequency, Float(af)] if af.present?
          end

          statements
        end

        def source_label(source)
          case source.to_s
          when 'exac'
            'ExAC'
          when 'gem_j_wga'
            'GEM-J WGA'
          when 'gnomad'
            'gnomAD'
          when 'hgvd'
            'HGVD'
          when 'jga_ngs'
            'JGA-NGS'
          when 'jga_snp'
            'JGA-SNP'
          when 'tommo'
            '4.7KJPN'
          else
            raise ArgumentError, "Unknown source: #{source}"
          end
        end

        def population_label(key)
          case key.to_s
          when 'AFR'
            'African/African American'
          when 'AMR'
            'American'
          when 'EAS'
            'East Asian'
          when 'FIN'
            'Finnish'
          when 'NFE'
            'Non-Finnish European'
          when 'SAS'
            'South Asian'
          when 'OTH'
            'Other'
          else
            raise ArgumentError, "Unknown key: #{key}"
          end
        end
      end
    end
  end
end
