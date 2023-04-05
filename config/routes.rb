# frozen_string_literal: true

Rails.application.routes.draw do
  root to: 'application#index'

  namespace :api do
    match 'search/variant', via: %w[get post]
    match 'search/gene', via: %w[get post]
    match 'search/disease', via: %w[get post]
    match 'inspect/disease', via: %w[get post]
    match 'download/variant', via: %w[get post]
  end

  # backward compatibility
  get 'suggest', to: 'root#suggest'
  get 'search', to: 'api/search#variant'
end
