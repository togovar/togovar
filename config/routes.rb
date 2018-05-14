require 'sidekiq/web'

Rails.application.routes.draw do
  root 'root#index'

  get 'search', to: 'root#index'

  # static pages
  get 'doc/about', to: 'static#about'
  get 'doc/terms', to: 'static#terms'
  get 'doc/policy', to: 'static#policy'
  get 'doc/contact', to: 'static#contact'
  get 'doc/faq', to: 'static#faq'

  # variation report
  get 'variation/:id', to: 'reports/variation#show', constraints: { id: /\d+/ }

  # gene report
  get 'gene/:id', to: 'reports/gene#show', constraints: { id: %r{[\w\-:.\/]+} }

  # api
  get 'suggest', to: 'root#suggest', defaults: { format: 'json' }
  match 'list', to: 'root#list', defaults: { format: 'json' }, via: [:get,:post]

  mount Sidekiq::Web, at: 'sidekiq'
end
