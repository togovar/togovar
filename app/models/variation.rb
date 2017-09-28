class Variation
  include Queryable

  GeneRegion = Struct.new(:chr, :low, :high) do
    class << self
      def parse(str)
        if (m = str.match(/(\d+):(\d+)-(\d+)/))
          new(m[1], m[2].to_i, m[3].to_i)
        else
          new(nil, nil, nil)
        end
      end
    end

    def valid?
      return false unless [chr, low, high].all?(&:present?)
      (chr.match?(/^[xy]$/i) || (1..22).cover?(chr.to_i)) &&
        (low.is_a?(Integer) && high.is_a?(Integer)) &&
        low <= high
    end

    def chromosome
      chr.match?(/^[xy]$/i) ? "chr #{chr.upcase}" : "chr #{chr}"
    end
  end

  class << self
    def all(offset: 0, limit: 1_000)
      sparql = region_template.sub('%%TARGET%%', '?variant ?chr ?position ?filter ?annotation ?allele_count ?allele_num ?allele_frequency')
                 .sub('%%VALUES%%', '')
                 .sub('%%FILTER%%', '')
                 .sub('%%OFFSET%%', "OFFSET #{offset}")
                 .sub('%%LIMIT%%', "LIMIT #{limit}")

      query(sparql)
    end

    def all_count
      sparql = <<-EOS.strip_heredoc
        DEFINE sql:select-option "order"
        PREFIX exo: <#{Endpoint.prefix.exo}>
        SELECT COUNT (DISTINCT ?variant) AS ?count
        FROM <#{Endpoint.ontology.exac}> {
          ?variant a exo:Variant .
        }
      EOS

      query(sparql).first[:count].to_i
    end

    def search_by_region(region, offset: 0, limit: 1_000)
      sparql = region_template.sub('%%TARGET%%', '?variant ?chr ?position ?filter ?annotation ?allele_count ?allele_num ?allele_frequency')
                 .sub('%%VALUES%%', "VALUES ?chr { \"#{region.chromosome}\" }")
                 .sub('%%FILTER%%', "FILTER ( #{region.low} <= ?position && ?position <= #{region.high} )")
                 .sub('%%OFFSET%%', "OFFSET #{offset}")
                 .sub('%%LIMIT%%', "LIMIT #{limit}")

      query(sparql)
    end

    def filtered_count(region)
      sparql = region_template.sub('%%TARGET%%', 'COUNT (DISTINCT ?variant) AS ?count')
                 .sub('%%VALUES%%', "VALUES ?chr { \"#{region.chromosome}\" }")
                 .sub('%%FILTER%%', "FILTER ( #{region.low} <= ?position && ?position <= #{region.high} )")
                 .sub('%%OFFSET%%', '')
                 .sub('%%LIMIT%%', '')

      query(sparql).first[:count].to_i
    end

    private

    def region_template
      <<-EOS.strip_heredoc
        DEFINE sql:select-option "order"
        PREFIX exo: <#{Endpoint.prefix.exo}>
        PREFIX faldo: <#{Endpoint.prefix.faldo}>
        SELECT %%TARGET%%
        FROM <#{Endpoint.ontology.exac}> {
          %%VALUES%%
          ?variant faldo:location/faldo:begin ?begin .
          ?begin faldo:reference/rdfs:label ?chr ;
                 faldo:position ?position .
          ?variant exo:filter ?filter ;
                   exo:consequence ?annotation ;
                   exo:alleleCount ?allele_count ;
                   exo:alleleNum ?allele_num ;
                   exo:alleleFrequency ?allele_frequency .
          %%FILTER%%
        }
        %%OFFSET%%
        %%LIMIT%%
      EOS
    end
  end

  def initialize(params)
    @params = params
    @region = GeneRegion.parse(params['term'])
  end

  def as_json(options = {})
    {
      recordsTotal:    (all = Variation.all_count),
      recordsFiltered: if @params['term'].present?
                         if @region.valid?
                           Variation.filtered_count(@region)
                         else
                           0
                         end
                       else
                         all
                       end,
      data:            variation.as_json
    }
  end

  def variation
    @variation ||= if @params['term'].present?
                     if @region.valid?
                       Variation.search_by_region(@region, offset: (page - 1) * per, limit: per)
                     else
                       {}
                     end
                   else
                     Variation.all(offset: (page - 1) * per, limit: per)
                   end
  end

  def page
    @params['start'].to_i / per + 1
  end

  def per
    @params['length'].to_i.positive? ? @params['length'].to_i : 10
  end
end
