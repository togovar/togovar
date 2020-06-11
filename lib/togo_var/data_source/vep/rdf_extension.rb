require 'togo_var/rdf/vocabulary'

module TogoVar::DataSource::VEP
  module RDFExtension
    include TogoVar::RDF::Vocabulary

    SUBJECT_FORMAT = 'http://identifiers.org/hco/%s/GRCh37#%d-%s-%s'.freeze
    SO_VARIANT_TYPE = Hash.new { |hash, key| hash[key] = SequenceOntology.find_by_label(key) }
    SO_CONSEQUENCE = Hash.new { |hash, key| hash[key] = SequenceOntology.find_by_label(key) }

    def to_statements
      statements = []

      s = RDF::URI.new(SUBJECT_FORMAT % [@record.chrom, @record.pos, @record.ref, @record.alt.first])

      consequences = Array(@record.info['CSQ']).map { |x| CONSEQUENCE_KEYS.zip(x.split('|')).to_h }
      variant_class = consequences.map { |x| x['VARIANT_CLASS'] }.uniq

      raise "Failed to obtain variant class" if variant_class.size.zero?
      raise "Variant class conflicts: #{variant_class}" unless variant_class.size == 1

      statements << [s, RDF.type, OBO[SO_VARIANT_TYPE[variant_class.first].id]]

      statements << [s, RDF::Vocab::DC.identifier, @record.id] unless @record.id == '.'

      label = [@record.chrom, @record.pos, @record.ref, @record.alt].join('-')
      statements << [s, RDF::Vocab::RDFS.label, label]

      location = @record.to_faldo_location
      statements << [s, FALDO.location, location.first.first]
      statements.concat(location)

      _, _, ref, alt = @record.to_refsnp_location
      statements << [s, M2R['reference_allele'], ref || '']
      statements << [s, M2R['alternative_allele'], alt || '']

      statements << [s, M2R['referece_allele_vcf'], @record.ref]
      statements << [s, M2R['alternative_allele_vcf'], @record.alt]

      consequences.flat_map { |x| x['Existing_variation'].split('&') }
        .reject(&:blank?)
        .compact
        .uniq
        .filter { |x| x.match?(/^rs\d+$/) }
        .each do |x|
        statements << [s, RDF::Vocab::RDFS.seeAlso, RDF::URI.new("http://identifiers.org/dbsnp/#{x}")]
      end

      consequences.each do |csq|
        statements << [s, TGVO.has_consequence, (bn = RDF::Node.new)]

        if (id = csq['Feature']).present?
          statements << [bn, TGVO.transcript, RDF::URI("http://rdf.ebi.ac.uk/resource/ensembl.transcript/#{id}")]
        end

        Array(csq['Consequence'].presence&.split('&')).each do |x|
          statements << [bn, RDF.type, OBO[SO_CONSEQUENCE[x].id]]
        end

        [csq['HGVSc'], csq['HGVSp'], csq['HGVSg']].map(&:presence).compact.each do |x|
          statements << [bn, RDF::Vocab::RDFS.label, x]
        end
        if (id = csq['Gene']).present?
          statements << [bn, TGVO.gene, RDF::URI("http://rdf.ebi.ac.uk/resource/ensembl/#{id}")]
        end
        if (id = csq['HGNC_ID']).present?
          statements << [bn, TGVO.gene, RDF::URI("http://rdf.ebi.ac.uk/resource/ensembl/#{id}")]
        end

        if (m = REAL_NUMBER_REGEX.match(csq['SIFT'])).present?
          statements << [bn, TGVO.sift, Float(m[0])]
        end
        if (m = REAL_NUMBER_REGEX.match(csq['PolyPhen'])).present?
          statements << [bn, TGVO.polyphen, Float(m[0])]
        end
      end

      statements
    end
  end
end
