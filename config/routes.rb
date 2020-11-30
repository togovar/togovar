# frozen_string_literal: true

Rails.application.routes.draw do
  root to: 'application#index'

  namespace :api do
    match 'search/variation', via: %w[get post]
  end
end
