class HGVS
  ENSEMBL_URL = if ENV['TOGOVAR_FRONTEND_REFERENCE'] == 'GRCh37'
                  'https://grch37.rest.ensembl.org'.freeze
                else
                  'https://rest.ensembl.org'.freeze
                end

  API = '/variant_recoder/human/%s'.freeze

  HGVSG = /^(NC_\d{6})\.\d+:g\.(\d+)_?(\d+)?(.+)/.freeze

  HGVS = /.+:[cgmnpr]\..+/.freeze

  REFSEQ_CHR = {
    'NC_000001' => '1',
    'NC_000002' => '2',
    'NC_000003' => '3',
    'NC_000004' => '4',
    'NC_000005' => '5',
    'NC_000006' => '6',
    'NC_000007' => '7',
    'NC_000008' => '8',
    'NC_000009' => '9',
    'NC_000010' => '10',
    'NC_000011' => '11',
    'NC_000012' => '12',
    'NC_000013' => '13',
    'NC_000014' => '14',
    'NC_000015' => '15',
    'NC_000016' => '16',
    'NC_000017' => '17',
    'NC_000018' => '18',
    'NC_000019' => '19',
    'NC_000020' => '20',
    'NC_000021' => '21',
    'NC_000022' => '22',
    'NC_000023' => 'X',
    'NC_000024' => 'Y',
    'NC_012920' => 'MT'
  }.freeze

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

            chr = REFSEQ_CHR[m[1]] || raise(UnknownSequenceError, "Failed to map RefSeq ID to chromosome: #{m[1]}")
            start = m[2]
            stop = m[3]
            allele = m[4]

            if stop.present?
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
