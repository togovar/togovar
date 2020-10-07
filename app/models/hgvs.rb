class HGVS
  ENSEMBL_URL = 'http://grch37.rest.ensembl.org'.freeze

  API = '/variant_recoder/human/%s'.freeze

  HGVSG = /^NC_0000((01\.10)|(02\.11)|(03\.11)|(04\.11)|(05\.9)|(06\.11)|(07\.13)|(08\.10)|(09\.11)|(10\.10)|(11\.9)|(12\.11)|(13\.10)|(14\.8)|(15\.9)|(16\.9)|(17\.10)|(18\.9)|(19\.9)|(20\.10)|(21\.8)|(22\.10)|(23\.10)|(24\.9)):g\.(\d+)_?(\d+)?(.+)/.freeze # GRCh37 only

  HGVS = /.+:[cgmnpr]\..+/.freeze

  class << self
    def match?(term)
      term.match?(HGVS)
    end

    def extract_location(term)
      result = begin
        connection = ::Faraday.new(ENSEMBL_URL) do |conn|
          conn.options[:open_timeout] = 30
          conn.options[:timeout] = 30
          conn.adapter Faraday.default_adapter
        end

        response = connection.get(API % URI.encode_www_form_component(term)) do |req|
          req.headers['Content-Type'] = 'application/json'
        end

        json = JSON.parse(response.body)
        Rails.logger.debug('HGVS') { json.to_json }

        if json.is_a?(Hash) && json['error'].present?
          Rails.logger.error('HGVS') { json['error'] }
          [term, json['error']]
        elsif (hgvsg = json.dig(0, 'hgvsg').filter { |x| x.match?(HGVSG) }).present?
          pos = hgvsg.map do |x|
            m = x.match(HGVSG)
            chr = Integer(m[1]&.slice(0..1))
            start = m[26]
            stop = m[27]
            allele = m[28]

            if stop
              "#{chr}:#{start}-#{stop}"
            else
              "#{chr}:#{start}:#{allele}"
            end
          end

          [pos.join(','), nil, json.dig(0, 'warnings', 0)]
        else
          [term]
        end
      rescue Faraday::ClientError => e
        Rails.logger.error(e)
        [term, "#{e.response&.status} #{e.response&.reason_phrase}"]
      rescue StandardError => e
        Rails.logger.error(e)
        [term, '500 Internal Server Error']
      end

      yield result if block_given?

      result
    end
  end
end
