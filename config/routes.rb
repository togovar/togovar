require 'sidekiq/web'

Rails.application.routes.draw do
  root 'root#index'

  get 'search', to: 'root#index'

  # static pages
  get 'about', to: 'static#about'
  get 'terms', to: 'static#terms'
  get 'policy', to: 'static#policy'
  get 'contact', to: 'static#contact'
  get 'faq', to: 'static#faq'

  # variation report
  get 'variation', to: 'reports/variation#show'

  # gene report
  get 'gene/:id', to: 'reports/gene#show', constraints: { id: %r{[\w\-:.\/]+} }

  # api
  get 'suggest', to: 'root#suggest', defaults: { format: 'json' }
  get 'list', to: 'root#list', defaults: { format: 'json' }

  mount Sidekiq::Web, at: 'sidekiq'
end
