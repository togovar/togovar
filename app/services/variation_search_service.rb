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
  end

  # @return [Hash]
  def execute
    debug.clear

    # remember to validate before obtaining debug information
    validate || raise_error

    ResponseFormatter.new(@params[:body], search, @errors).format
  end

  private

  def validate
    @spec_no_errors = spec.validate
    @model_no_errors = model.validate

    debug[:model] = model.nested_debugs if @options[:debug]

    @spec_no_errors && @model_no_errors
  end

  def raise_error
    raise Errors::APIValidationError.new('API validation error', errors: spec.errors) unless @spec_no_errors
    raise Errors::QueryParseError.new('Query parse error', errors: model.full_messages) unless @model_no_errors
  end

  def spec
    @spec ||= TogoVar::API::Spec::Validator.new schema(@params.fetch(:version, '1')),
                                                method: :post,
                                                path: '/search/variation',
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
      filtered_total: Variation.count(body: query.slice(:query)),
      results: Variation.search(query).records.results,
      aggs: paging? ? {} : Variation.search(stat_query).aggregations
    }
  end

  def query
    @query ||= model.to_hash.tap { |q| debug[:query] = q if @options[:debug] }
  end

  def paging?
    (offset = @params[:body][:offset]).present? && (offset != 0 || offset.is_a?(Array))
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
