class HGVS
  class << self
    ENSEMBL_URL = 'https://grch37.rest.ensembl.org'.freeze
    API = '/variant_recoder/human/%s'.freeze

    HGVSG = /^NC_0000((01\.10)|(02\.11)|(03\.11)|(04\.11)|(05\.9)|(06\.11)|(07\.13)|(08\.10)|(09\.11)|(10\.10)|
              (11\.9)|(12\.11)|(13\.10)|(14\.8)|(15\.9)|(16\.9)|(17\.10)|(18\.9)|(19\.9)|(20\.10)|
              (21\.8)|(22\.10)|(23\.10)|(24\.9)):g\.(\d+)_?(\d+)?.+/x.freeze # GRCh37 only

    HGVS = /.+:[cgmnpr]\..+/.freeze

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
        Rails.logger.debug('HGVS') { json }

        if json.is_a?(Hash) && json['error'].present?
          Rails.logger.error('HGVS') { json['error'] }
          [term, json['error']]
        elsif (m = json.dig(0, 'hgvsg', 0)&.match(HGVSG))
          chr = Integer(m[1]&.slice(0..1))
          start = m[26]
          stop = m[27]

          if stop
            ["#{chr}:#{start}-#{stop}", nil, json.dig(0, 'warnings', 0)]
          else
            ["#{chr}:#{start}", nil, json.dig(0, 'warnings', 0)]
          end
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

      yield result

      result
    end
  end
end
