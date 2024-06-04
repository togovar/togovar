# frozen_string_literal: true

class VariationSearchService
  attr_reader :options
  attr_reader :debug

  # @param [Hash] params The request parameters
  # @param [Hash] options
  # @option options [Hash] :headers The request header
  # @option options [Boolean] :debug
  def initialize(params, **options)
    @params = params
    @options = options

    @debug = {}
    @errors = {}

    if @params[:body] && @params[:offset]&.respond_to?(:to_i)
      @params[:body][:offset] = @params[:offset].to_i
    end
  end

  # @return [Hash]
  def execute
    debug.clear

    # remember to validate before obtaining debug information
    validate

    params = @params
    if (body = @params.delete(:body))
      params.merge!(body)
    end

    if @params[:formatter] === 'html'
      HtmlFormatter.new(params, search).to_hash
    else
      ResponseFormatter.new(params, search, @errors).to_hash
    end
  end

  def validate
    valid_spec = spec.validate
    valid_model = model.validate

    debug[:model] = model.nested_debugs if @options[:debug]

    raise Errors::APIValidationError.new('API validation error', errors: spec.errors) unless valid_spec
    raise Errors::QueryParseError.new('Query parse error', errors: model.full_messages) unless valid_model
  end

  def results
    Variation.search(query).records.results
  end

  def total
    Variation.count(body: query.slice(:query))
  end

  private

  def spec
    @spec ||= TogoVar::API::Spec::Validator.new schema(@params.fetch(:version, '1')),
                                                method: :post,
                                                path: '/search/variant',
                                                parameters: @params,
                                                headers: @options.fetch(:headers, {}),
                                                body: @params[:body]
  end

  def schema(version)
    if (path = spec_path(version).to_s).match?(/\.erb$/)
      YAML.safe_load(ERB.new(File.read(path)).result)
    else
      YAML.load_file(path)
    end
  end

  def spec_path(version)
    case version
    when '1'
      Rails.root / 'doc' / 'api' / 'v1.yml.erb'
    else
      raise Errors::SpecNotFoundError.new('Spec not found error', errors: ["Undefined version: #{version}"])
    end
  end

  def model
    @model ||= TogoVar::API::VariationSearch.new(@params[:body]).model
  end

  def search
    {
      filtered_total: total,
      results: results,
      aggs: paging? ? {} : Variation.search(stat_query, request_cache: true).aggregations
    }
  end

  def query
    @query ||= model.to_hash.tap { |q| debug[:query] = q if @options[:debug] }
  end

  def paging?
    (offset = @params.dig(:body, :offset)).present? && (offset != 0 || offset.is_a?(Array))
  end

  def stat_query
    @stat_query ||= begin
                      hash = query.dup
                      hash.update size: 0
                      hash.delete :from
                      hash.delete :sort
                      hash.merge!(Variation::QueryHelper.statistics)

                      hash.tap { |h| debug[:stat_query] = h if @options[:debug] }
                    end
  end
end
