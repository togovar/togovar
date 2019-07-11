require 'sidekiq/web'

Rails.application.routes.draw do
  root 'root#index'

  resources :variant, only: [:show], controller: 'reports/variant', constraints: { id: /tgv\d+/ }

  # static pages
  get 'doc/about', to: 'static#about'
  get 'doc/contact', to: 'static#contact'
  get 'doc/datasets', to: 'static#datasets'
  get 'doc/datasets/jga_ngs', to: 'static#jga_ngs'
  get 'doc/datasets/jga_snp', to: 'static#jga_snp'
  get 'doc/datasets/analysis', to: 'static#analysis'
  get 'doc/history', to: 'static#history'
  get 'doc/help', to: 'static#help'
  get 'doc/policy', to: 'static#policy'
  get 'doc/terms', to: 'static#terms'

  get '/downloads', to: 'static#downloads'

  # api
  get 'suggest', to: 'root#suggest', defaults: { format: 'json' }
  get 'search', to: 'root#search', defaults: { format: 'json' }
end
