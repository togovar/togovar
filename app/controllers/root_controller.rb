class RootController < ApplicationController
  protect_from_forgery except: %i[suggest list]

  def suggest
    term = params.permit(:term)[:term]

    respond_to do |format|
      format.json do
        @response = if term && term.length >= 3
                      {
                        gene: GeneSymbol.suggest(term).suggestions.map { |_, v| v.first[:options] }.flatten,
                        disease: Disease.suggest(term).results
                      }
                    else
                      Hash.new { [] }
                    end

        render 'suggest', formats: 'json', handlers: 'jbuilder'
      end
    end
  end

  BINARY_FILTERS = %i[dataset type significance consequence sift polyphen].freeze

  def search
    @param = Form::VariantSearchParameters.new(search_params)

    respond_to do |format|
      format.json do
        if @param.debug?
          render json: @param.stat? ? [builder.stat_query, builder.build] : builder.build
          return
        end

        aggs = @param.stat? ? Variant.search(builder.stat_query).aggregations : {}
        response = Variant.search(builder.build, @param.term.present? ? {} : { request_cache: true })

        @result = {
          filtered_total: response.raw_response['hits']['total'],
          hits: response.raw_response['hits']['hits']
                  .map { |hit| Elasticsearch::Model::Response::Result.new(hit) },
          aggs: aggs
        }

        render 'search', formats: 'json', handlers: 'jbuilder'
      end
    end
  end

  private

  def builder
    @builder ||= begin
      builder = Elasticsearch::QueryBuilder.new
      builder.term(@param.term)
      builder.from = @param.offset
      builder.size = @param.limit

      if BINARY_FILTERS.map { |x| @param.selected_none?(x) }.any?
        builder.from = 0
        builder.size = 0
      else
        unless @param.selected_all?(:dataset)
          @param.selected_items(:dataset).each do |name|
            builder.dataset(name)
          end
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

  # @return [ActionController::Parameters] parameters
  def search_params
    Form::VariantSearchParameters.permit(params)
  end
end
