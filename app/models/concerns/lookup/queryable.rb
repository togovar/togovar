class Lookup
  module Queryable
    extend ActiveSupport::Concern

    included do
      include ::Queryable
    end

    module ClassMethods
      ATTRIBUTES = { jga_ngs: Lookup::JGA::NGS,
                     jga_snp: Lookup::JGA::SNP,
                     tommo:   Lookup::ToMMo,
                     hgvd:    Lookup::HGVD,
                     exac:    Lookup::ExAC,
                     clinvar: Lookup::ClinVar }.freeze

      def find(*id)
        r = fetch(*id).map { |_, v| Lookup.new(v) }
        id.count == 1 ? r.first : r
      end

      def fetch(*id)
        result = base_and_mol(*id)

        result.deep_merge!(rs(*id))
        # result.deep_merge!(gene(*id))
        result.deep_merge!(transcript(*id))
        result.deep_merge!(clinvar(*id))
        result.deep_merge!(exac(*id))
        result.deep_merge!(hgvd(*id))

        result
      end

      private

      def base_and_mol(*id)
        base = query(sparql_for_base_mol(*id))
        base.map { |x| [x[:tgv_id], x] }.to_h
      end

      def rs(*id)
        rs = query(sparql_for_rs(*id))
        rs.group_by { |x| x[:tgv_id] }
          .map { |x| [x[0], { rs: x[1].map { |y| y[:rs] } }] }
          .to_h
      end

      def gene(*id)
        rs = query(sparql_for_gene(*id))
        rs.group_by { |x| x[:tgv_id] }.map do |x|
          [x[0], { gene:          x[1].map { |y| y[:gene] },
                   symbol:        x[1].map { |y| y[:symbol] },
                   symbol_source: x[1].map { |y| y[:symbol_source] } }]
        end.to_h
      end

      def transcript(*id)
        tr = query(sparql_for_transcript(*id))
        g1 = tr.group_by { |x| x[:tr] }.map do |_, g|
          { tgv_id:       g.map { |y| y[:tgv_id] }.uniq.first,
            consequences: g.map { |y| y[:consequence] },
            hgvs_c:       g.map { |y| y[:hgvs_c] }.uniq.first,
            sift:         g.map { |y| y[:sift] }.uniq.first,
            polyphen:     g.map { |y| y[:polyphen] }.uniq.first }
        end
        g1.group_by { |x| x[:tgv_id] }.map do |k, g|
          g.each { |x| x.delete(:tgv_id) }
          [k, { transcripts: g }]
        end.to_h
      end

      def clinvar(*id)
        cl = query(sparql_for_clinvar(*id))
        cl.group_by { |x| x[:tgv_id] }.map do |k, g|
          g.each { |x| x.delete(:tgv_id) }
          [k, { clinvar: { allele_id:     g.map { |y| y[:allele_id] }.uniq.first,
                           significances: g.map { |y| y[:significance] }.uniq,
                           conditions:    g.map { |y| y[:condition] }.uniq } }]
        end.to_h
      end

      def exac(*id)
        ex = query(sparql_for_exac(*id))
        ex.map { |x| [x.delete(:tgv_id), { exac: x }] }.to_h
      end

      def hgvd(*id)
        hgvd = query(sparql_for_hgvd(*id))
        hgvd.map { |x| [x.delete(:tgv_id), { hgvd: x }] }.to_h
      end

      def values(*args)
        args = args.first if args.first.is_a?(Enumerable)
        args.map { |x| "<http://togovar.org/variation/#{x}>" }.join(' ')
      end

      def sparql_for_base_mol(*args)
        <<-SPARQL.strip_heredoc
          DEFINE sql:select-option "order"

          PREFIX dc: <http://purl.org/dc/terms/>
          PREFIX tgl: <http://togovar.org/lookup#>

          SELECT ?tgv_id ?chromosome ?start ?stop ?variant_type ?reference ?alternative ?hgvs_g
          FROM <http://togovar.org/graph/lookup>
          WHERE {
            VALUES ?var { #{values(*args)} }
            ?var dc:identifier ?tgv_id ;
              tgl:chromosome ?chromosome ;
              tgl:start ?start ;
              tgl:stop ?stop ;
              tgl:variant_type ?variant_type .
            OPTIONAL { ?var tgl:ref ?reference . }
            OPTIONAL { ?var tgl:alt ?alternative . }
            OPTIONAL { ?var tgl:hgvs_g ?hgvs_g . }
          }
        SPARQL
      end

      def sparql_for_rs(*args)
        <<-SPARQL.strip_heredoc
          DEFINE sql:select-option "order"

          PREFIX dc: <http://purl.org/dc/terms/>
          PREFIX tgl: <http://togovar.org/lookup#>

          SELECT ?tgv_id ?rs
          FROM <http://togovar.org/graph/lookup>
          WHERE {
            VALUES ?var { #{values(*args)} }
            ?var tgl:rs ?rs ;
              dc:identifier ?tgv_id .
          }
        SPARQL
      end

      def sparql_for_gene(*args)
        <<-SPARQL.strip_heredoc
          DEFINE sql:select-option "order"

          PREFIX dc: <http://purl.org/dc/terms/>
          PREFIX tgl: <http://togovar.org/lookup#>

          SELECT ?tgv_id ?gene ?symbol ?symbol_source
          FROM <http://togovar.org/graph/lookup>
          WHERE {
            VALUES ?var { #{values(*args)} }
            ?var tgl:gene ?gene ;
              tgl:symbol ?symbol ;
              dc:identifier ?tgv_id .
            OPTIONAL { ?var tgl:symbol_source ?symbol_source . }
          }
        SPARQL
      end

      def sparql_for_transcript(*args)
        <<-SPARQL.strip_heredoc
          DEFINE sql:select-option "order"

          PREFIX dc: <http://purl.org/dc/terms/>
          PREFIX tgl: <http://togovar.org/lookup#>

          SELECT ?tgv_id ?tr ?consequence ?hgvs_c ?sift ?polyphen
          FROM <http://togovar.org/graph/lookup>
          WHERE {
            VALUES ?var { #{values(*args)} }
            ?var tgl:transcript ?tr ;
              dc:identifier ?tgv_id .
            OPTIONAL { ?tr tgl:consequence ?consequence . }
            OPTIONAL { ?tr tgl:hgvs_c ?hgvs_c . }
            OPTIONAL { ?tr tgl:sift ?sift . }
            OPTIONAL { ?tr tgl:polyphen ?polyphen . }
          }
        SPARQL
      end

      def sparql_for_clinvar(*args)
        <<-SPARQL.strip_heredoc
          DEFINE sql:select-option "order"

          PREFIX dc: <http://purl.org/dc/terms/>
          PREFIX tgl: <http://togovar.org/lookup#>

          SELECT ?tgv_id ?allele_id ?significance ?condition
          FROM <http://togovar.org/graph/lookup>
          WHERE {
            VALUES ?var { #{values(*args)} }
            ?var tgl:clinvar ?clinvar ;
              dc:identifier ?tgv_id .
            ?clinvar tgl:allele_id ?allele_id ;
              tgl:conditions ?condition ;
              tgl:significances ?significance .
          }
        SPARQL
      end

      def sparql_for_exac(*args)
        <<-SPARQL.strip_heredoc
          DEFINE sql:select-option "order"

          PREFIX dc: <http://purl.org/dc/terms/>
          PREFIX tgl: <http://togovar.org/lookup#>

          SELECT ?tgv_id ?num_alt_alleles ?num_alleles ?passed ?frequency
          FROM <http://togovar.org/graph/lookup>
          WHERE {
            VALUES ?var { #{values(*args)} }
            ?var tgl:exac ?exac ;
              dc:identifier ?tgv_id .
            ?exac tgl:numAltAlleles ?num_alt_alleles ;
              tgl:numAlleles ?num_alleles ;
              tgl:passed ?passed ;
              tgl:frequency ?frequency .
          }
        SPARQL
      end

      def sparql_for_hgvd(*args)
        <<-SPARQL.strip_heredoc
          DEFINE sql:select-option "order"

          PREFIX dc: <http://purl.org/dc/terms/>
          PREFIX tgl: <http://togovar.org/lookup#>

          SELECT ?tgv_id ?num_alt_alleles ?num_alleles ?frequency
          FROM <http://togovar.org/graph/lookup>
          WHERE {
            VALUES ?var { #{values(*args)} }
            ?var tgl:hgvd ?hgvd ;
              dc:identifier ?tgv_id .
            ?hgvd tgl:numAltAlleles ?num_alt_alleles ;
              tgl:numAlleles ?num_alleles ;
              tgl:frequency ?frequency .
          }
        SPARQL
      end

      def sparql_for_jga_ngs(*args)
        <<-SPARQL.strip_heredoc
        SPARQL
      end

      def sparql_for_jga_snp(*args)
        <<-SPARQL.strip_heredoc
        SPARQL
      end

      def sparql_for_tommo(*args)
        <<-SPARQL.strip_heredoc
        SPARQL
      end

    end
  end
end