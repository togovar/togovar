class RootController < ApplicationController
  protect_from_forgery except: %i[suggest list]

  def suggest
    term = suggest_params[:term]

    respond_to do |format|
      format.json do
        @response = if term && term.length >= 3
                      {
                        gene: Gene.suggest(term),
                        disease: Disease.suggest(term)
                      }
                    else
                      Hash.new { [] }
                    end

        render 'suggest', formats: :json, handlers: 'jbuilder'
      end
    end
  end

  BINARY_FILTERS = %i[dataset type significance consequence sift polyphen].freeze

  def search
    @param = Form::VariantSearchParameters.new(search_params)
    @term = @param.term

    respond_to do |format|
      format.json do
        if @param.debug?
          render json: @param.stat? ? [builder.stat_query, builder.build] : builder.build
          return
        end

        @result = begin
          if BINARY_FILTERS.map { |x| @param.selected_none?(x) }.any?
            {
              filtered_total: 0,
              hits: [],
              aggs: {}
            }
          else
            if HGVS.match?(@term)
              HGVS.extract_location(@term) do |term, error, warning|
                @error = error
                @warning = warning
                @notice = "Translate HGVS representation \"#{@term}\" to \"#{term}\"" unless @term == term
                @term = term
              end
            end

            response = Variation.search(builder.build, request_cache: !@term.present?)
            {
              filtered_total: Variation.count(body: builder.build.slice(:query)),
              results: response.records.results,
              aggs: @param.stat? ? Variation.search(builder.stat_query).aggregations : {}
            }
          end
        rescue StandardError => e
          Rails.logger.error('search') { builder.stat_query.to_json }
          Rails.logger.error('search') { builder.build.to_json }
          Rails.logger.error('search') { e.message }
          {}
        end

        render 'search', formats: :json, handlers: 'jbuilder'
      end
    end
  end

  private

  def builder
    @builder ||= begin
      builder = Elasticsearch::QueryBuilder.new

      builder.start_only = @param.start_only?

      builder.term(@term) if @term.present?

      builder.from = @param.offset
      builder.size = @param.limit

      if BINARY_FILTERS.map { |x| @param.selected_none?(x) }.any?
        builder.from = 0
        builder.size = 0
      else
        unless @param.selected_all?(:dataset)
          builder.dataset(@param.selected_items(:dataset))
        end

        unless @param.frequency == Form::Frequency.defaults
          builder.frequency(@param.selected_items(:dataset),
                            @param.frequency[:from],
                            @param.frequency[:to],
                            @param.frequency[:invert] == '1',
                            @param.frequency[:match] == 'all')
        end

        if @param.quality == '1'
          builder.quality(@param.selected_items(:dataset))
        end

        %i[type significance consequence sift polyphen].each do |x|
          unless @param.selected_all?(x)
            builder.send(x, *@param.selected_items(x))
          end
        end
      end

      builder
    end
  end

  def search_params
    Form::VariantSearchParameters.permit(params)
  end

  def suggest_params
    params.permit(:term, :format)
  end
end
