# frozen_string_literal: true

Rails.application.routes.draw do
  get 'api/v1', to: 'api#v1'

  namespace :api do
    match 'search/variant', via: %w[get post]
    match 'search/gene', via: %w[get post]
    match 'search/disease', via: %w[get post]
    match 'inspect/disease', via: %w[get post]
    match 'download/variant', via: %w[get post]
  end

  get 'auth/status', to: 'auth#status'
  get 'auth/login', to: 'auth#auth_login'
  get 'auth/logout', to: 'auth#auth_logout'
  get 'auth/:provider/callback', to: 'auth#auth_callback'

  # backward compatibility
  get 'suggest', to: 'suggest#index'
  get 'search', to: 'api/search#variant'

  mount Rswag::Ui::Engine => 'api'
end
