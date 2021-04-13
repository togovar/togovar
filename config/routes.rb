# frozen_string_literal: true

Rails.application.routes.draw do
  root to: 'application#index'

  namespace :api do
    match 'search/variation', via: %w[get post]
  end

  # backward compatibility
  get 'suggest', to: 'root#suggest'
  get 'search', to: 'api/search#variation'
end
