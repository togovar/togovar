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
    param = Form::VariantSearchParameters.new(search_params)

    respond_to do |format|
      format.json do
        builder = Elasticsearch::QueryBuilder.new
        builder.term(@param.term)

        if BINARY_FILTERS.map { |x| param.selected_none?(x) }.any?
          builder.count_only(true)
        else
          unless param.selected_all?(:dataset)
            param.selected_items(:dataset).each do |name|
              builder.dataset(name)
            end
          end

          %i[type significance consequence sift polyphen].each do |x|
            unless param.selected_all?(x)
              builder.send(x, *param.selected_items(x))
            end
          end
        end

        if param.debug?
          render json: builder.build
          return
        end

        @response = Variant.search(builder.build)
        render 'search', formats: 'json', handlers: 'jbuilder'
      end
    end
  end

  private

  # @return [ActionController::Parameters] parameters
  def search_params
    Form::VariantSearchParameters.permit(params)
  end
end
