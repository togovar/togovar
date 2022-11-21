class HGVS
  ENSEMBL_URL = if ENV['TOGOVAR_FRONTEND_REFERENCE'] == 'GRCh37'
                  'https://grch37.rest.ensembl.org'.freeze
                else
                  'https://rest.ensembl.org'.freeze
                end

  API = '/variant_recoder/human/%s'.freeze

  HGVSG = /^NC_(\d{6})\.\d+:g\.(\d+)_?(\d+)?(.+)/.freeze

  HGVS = /.+:[cgmnpr]\..+/.freeze

  class UnknownSequenceError < StandardError; end

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

        hgvsg = json.map { |x| x.filter { |_, v| v.is_a?(Hash) }.map { |_, v| v['hgvsg'] } }
                    .flatten
                    .uniq
                    .filter { |x| x.match?(HGVSG) }

        if json.is_a?(Hash) && json['error'].present?
          Rails.logger.error('HGVS') { json['error'] }
          [term, json['error']]
        elsif hgvsg.present?
          pos = hgvsg.map do |x|
            m = x.match(HGVSG)
            chr = if (1..22).cover?((n = Integer(m[1])))
                    n
                  elsif n == 23
                    'X'
                  elsif n == 24
                    'Y'
                  elsif n == 12920
                    'MT'
                  else
                    raise UnknownSequenceError, "Failed to parse HGVSg representation: #{x}"
                  end
            start = m[2]
            stop = m[3]
            allele = m[4]

            if stop
              "#{chr}:#{start}-#{stop}:#{allele}"
            else
              "#{chr}:#{start}:#{allele}"
            end
          end

          [pos.join(','), nil, json.dig(0, 'warnings', 0)]
        else
          [term]
        end
      rescue Faraday::ClientError => e
        Rails.logger.error('HGVS') { e }
        [term, "#{e.response&.status} #{e.response&.reason_phrase}"]
      rescue UnknownSequenceError => e
        Rails.logger.error('HGVS') { e }
        [term, e.message]
      rescue StandardError => e
        Rails.logger.error('HGVS') { e }
        [term, '500 Internal Server Error']
      end

      yield result if block_given?

      result
    end
  end
end
